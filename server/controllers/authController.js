/**
 * AUTH CONTROLLER — VỊ NHÀ MÌNH
 * Mục 1: Đăng ký / đăng nhập, phân quyền, SĐT E.164 và consent bảo mật
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const { 
  normalizePhoneE164, 
  isValidPhoneE164, 
  isValidEmail, 
  validatePassword, 
  isValidName 
} = require('../../shared/validators.js');

// In-memory rate limiting
const rateLimitMap = new Map();
function checkRateLimit(ip, action, maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  const key = `${ip}_${action}`;
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  rateLimitMap.set(key, record);

  return record.count <= maxAttempts;
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 1. Đăng ký tài khoản khách hàng mới
async function register(req, res, next) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'register', 10, 15 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã thực hiện quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 15 phút.'
      });
    }

    const { name, email, password, phone, dial_code, consent, privacy_consent, birthdate } = req.body;
    // Chưa dùng: trường birthdate là dự phòng cho tính năng ưu đãi sinh nhật ở phiên bản sau

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ họ tên, email và mật khẩu.'
      });
    }

    // Kiểm tra đồng ý chính sách bảo mật & điều khoản
    const hasConsented = consent === true || privacy_consent === true || consent === 'true';
    if (!hasConsented) {
      return res.status(400).json({
        success: false,
        message: 'Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tiếp tục.'
      });
    }

    // Validate Họ tên
    if (!isValidName(name)) {
      return res.status(400).json({
        success: false,
        message: 'Họ tên chỉ gồm chữ cái, không chứa số và dài từ 2 đến 50 ký tự.'
      });
    }

    // Validate Email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng hợp lệ.'
      });
    }

    // Validate Mật khẩu
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.message
      });
    }

    // Chuẩn hóa và kiểm tra số điện thoại chuẩn E.164
    let phoneE164 = null;
    if (phone && String(phone).trim() !== '') {
      phoneE164 = normalizePhoneE164(String(phone).trim(), dial_code || '+84');
      if (!phoneE164 || !isValidPhoneE164(phoneE164)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không đúng định dạng chuẩn quốc tế (ví dụ: 0901234567 hoặc +84901234567).'
        });
      }

      // Kiểm tra SĐT đã tồn tại chưa (SĐT là duy nhất)
      const existingPhone = await dbAsync.get('SELECT id FROM users WHERE phone_e164 = ?', [phoneE164]);
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại này đã được sử dụng. Vui lòng đăng nhập hoặc dùng số khác.'
        });
      }
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await dbAsync.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.'
      });
    }

    // Hash mật khẩu an toàn
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await dbAsync.run(
      `INSERT INTO users (name, email, password, phone, phone_e164, role, privacy_consented_at) 
       VALUES (?, ?, ?, ?, ?, 'customer', CURRENT_TIMESTAMP)`,
      [
        name.trim(), 
        email.toLowerCase().trim(), 
        hashedPassword, 
        phone ? String(phone).trim() : null,
        phoneE164
      ]
    );

    const newUser = await dbAsync.get(
      'SELECT id, name, email, phone, phone_e164, role, loyalty_points, privacy_consented_at, created_at FROM users WHERE id = ?',
      [result.id]
    );

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        user: newUser,
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

// 2. Đăng nhập tài khoản (hỗ trợ cả Email hoặc Số điện thoại E.164)
async function login(req, res, next) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'login', 10, 15 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.'
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email hoặc số điện thoại và mật khẩu.'
      });
    }

    const identifier = email.trim();
    const potentialE164 = normalizePhoneE164(identifier);

    // Tìm theo email hoặc theo phone_e164
    let user;
    if (potentialE164) {
      user = await dbAsync.get(
        'SELECT id, name, email, password, phone, phone_e164, role, loyalty_points, is_locked FROM users WHERE email = ? OR phone_e164 = ?',
        [identifier.toLowerCase(), potentialE164]
      );
    } else {
      user = await dbAsync.get(
        'SELECT id, name, email, password, phone, phone_e164, role, loyalty_points, is_locked FROM users WHERE email = ?',
        [identifier.toLowerCase()]
      );
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email, số điện thoại hoặc mật khẩu không chính xác.'
      });
    }

    // Kiểm tra tài khoản bị khóa
    if (user.is_locked === 1) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email, số điện thoại hoặc mật khẩu không chính xác.'
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phone_e164: user.phone_e164,
      role: user.role,
      loyalty_points: user.loyalty_points
    };

    const token = generateToken(safeUser);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        user: safeUser,
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

// 3. Kiểm tra số điện thoại đã tồn tại chưa (Check Phone API)
async function checkPhone(req, res, next) {
  try {
    const rawPhone = req.query.phone || req.body?.phone;
    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số điện thoại để kiểm tra.'
      });
    }

    const dialCode = req.query.dial_code || req.body?.dial_code || '+84';
    const e164 = normalizePhoneE164(String(rawPhone).trim(), dialCode);

    if (!e164) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không đúng định dạng.'
      });
    }

    const user = await dbAsync.get('SELECT id FROM users WHERE phone_e164 = ?', [e164]);

    res.json({
      success: true,
      exists: Boolean(user),
      phone_e164: e164
    });
  } catch (err) {
    next(err);
  }
}

// 4. Lấy thông tin cá nhân hiện tại
async function getMe(req, res, next) {
  try {
    const user = await dbAsync.get(
      'SELECT id, name, email, phone, phone_e164, role, loyalty_points, birthdate, privacy_consented_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tài khoản.'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  checkPhone,
  getMe
};
