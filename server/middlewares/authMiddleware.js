/**
 * AUTHENTICATION & AUTHORIZATION MIDDLEWARE
 * Áp dụng skills: auth-implementation-patterns, backend-security-coder
 * Kiểm tra JSON Web Token và phân quyền vai trò (Admin, Staff, Customer)
 */

const jwt = require('jsonwebtoken');

const DEFAULT_JWT_SECRET = 'vinhaminh_super_secret_jwt_key_2026';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

// C13: Cảnh báo khi dùng JWT_SECRET mặc định trong mã
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  CẢNH BÁO BẢO MẬT: Chưa cấu hình JWT_SECRET trong biến môi trường (.env), đang dùng khóa mặc định.');
}

/**
 * Middleware xác thực Token JWT (C3)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.originalUrl && req.originalUrl.includes('/api/dashboard/export-csv') && req.query && req.query.token) {
    // Cho phép query string token RIÊNG cho tính năng tải báo cáo CSV của Admin
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      // C3: Trả 401 khi token hết hạn hoặc sai định dạng để client xóa phiên và kích hoạt auth:expired
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'
      });
    }

    req.user = decodedUser;
    next();
  });
}

/**
 * Middleware tùy chọn: Nếu có token thì giải mã, nếu không có thì vẫn cho qua (khách vãng lai)
 */
function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
      if (!err) {
        req.user = decodedUser;
      }
      next();
    });
  } else {
    next();
  }
}

/**
 * Middleware phân quyền (Role-based Access Control)
 * @param  {...string} allowedRoles Các vai trò được phép ('admin', 'staff', 'customer')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập để truy cập tài nguyên này.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có đủ quyền hạn để thực hiện thao tác này.'
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  optionalToken,
  authorizeRoles
};
