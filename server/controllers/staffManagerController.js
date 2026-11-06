/**
 * STAFF & USER MANAGER CONTROLLER (Mục 17: Quản trị nhân viên, phân quyền & khách hàng)
 * Áp dụng skills: backend-development-feature-development, sql-pro, auth-implementation-patterns
 */

const bcrypt = require('bcryptjs');
const { dbAsync } = require('../config/db');

// Lấy danh sách nhân viên
async function getStaffList(req, res, next) {
  try {
    const list = await dbAsync.all(
      `SELECT id, name, email, phone, role, is_locked, created_at 
       FROM users 
       WHERE role IN ('admin', 'staff')
       ORDER BY role ASC, id ASC`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

// Thêm tài khoản nhân viên mới
async function createStaffUser(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ họ tên, email và mật khẩu.' });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password);

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Họ tên không được để trống.' });
    }

    // Kiểm tra định dạng email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Email không đúng định dạng.' });
    }

    // Kiểm tra email không được trùng
    const existing = await dbAsync.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email này đã tồn tại trong hệ thống.' });
    }

    // Mật khẩu tối thiểu 6 ký tự
    if (cleanPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
    }

    // Quy định: chỉ cho phép tạo tài khoản STAFF từ giao diện quản trị
    const assignedRole = 'staff';

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(cleanPassword, salt);

    await dbAsync.run(
      `INSERT INTO users (name, email, password, phone, role, is_locked) VALUES (?, ?, ?, ?, ?, 0)`,
      [cleanName, cleanEmail, hash, phone ? String(phone).trim() : null, assignedRole]
    );

    res.status(201).json({ success: true, message: 'Đã tạo tài khoản nhân viên mới thành công!' });
  } catch (err) {
    next(err);
  }
}

// Cập nhật vai trò phân quyền
async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'staff', 'customer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò phân quyền không hợp lệ.' });
    }

    await dbAsync.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true, message: `Đã cập nhật vai trò người dùng sang: ${role}` });
  } catch (err) {
    next(err);
  }
}

// Khóa / Mở khóa tài khoản (áp dụng cho cả nhân viên và khách hàng)
async function toggleUserLock(req, res, next) {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ.' });
    }

    // Chặn admin tự khóa chính mình
    if (req.user && parseInt(req.user.id, 10) === targetId) {
      return res.status(400).json({
        success: false,
        message: 'Quản trị viên không thể tự khóa tài khoản của chính mình.'
      });
    }

    const user = await dbAsync.get('SELECT id, name, role, is_locked FROM users WHERE id = ?', [targetId]);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    if (user.role === 'admin' && req.user && parseInt(req.user.id, 10) === user.id) {
      return res.status(400).json({
        success: false,
        message: 'Quản trị viên không thể tự khóa tài khoản của chính mình.'
      });
    }

    const newLock = user.is_locked === 1 ? 0 : 1;
    await dbAsync.run('UPDATE users SET is_locked = ? WHERE id = ?', [newLock, targetId]);

    res.json({
      success: true,
      message: newLock === 1 ? `Đã khóa tài khoản "${user.name}" thành công.` : `Đã mở khóa tài khoản "${user.name}".`,
      data: { id: user.id, is_locked: newLock }
    });
  } catch (err) {
    next(err);
  }
}

// Lấy danh sách khách hàng và lịch sử chi tiêu
async function getCustomerList(req, res, next) {
  try {
    const customers = await dbAsync.all(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.loyalty_points, u.is_locked, u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status != 'cancelled'
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY total_spent DESC
    `);

    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStaffList,
  createStaffUser,
  updateRole,
  toggleUserLock,
  getCustomerList
};
