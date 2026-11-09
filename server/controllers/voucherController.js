/**
 * VOUCHER CONTROLLER (Mục 6: Voucher & Khuyến mãi)
 * Áp dụng skills: backend-development-feature-development, sql-pro
 */

const { dbAsync } = require('../config/db');

// Lấy danh sách voucher khả dụng cho khách hàng
async function getAvailableVouchers(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    let query = `
      SELECT id, code, description, discount_type, discount_value, min_order_value, max_discount, min_tier, user_id 
      FROM vouchers 
      WHERE is_active = 1 AND used_count < usage_limit
    `;
    const params = [];

    if (userId) {
      query += ` AND (user_id IS NULL OR user_id = ?)`;
      params.push(userId);
    } else {
      query += ` AND user_id IS NULL`;
    }

    query += ` ORDER BY discount_value DESC`;

    const vouchers = await dbAsync.all(query, params);

    res.json({
      success: true,
      data: vouchers
    });
  } catch (err) {
    next(err);
  }
}

// Kiểm tra mã voucher và tính số tiền giảm giá
async function validateVoucher(req, res, next) {
  try {
    const { code, subtotal } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã voucher.' });
    }

    const voucher = await dbAsync.get(
      'SELECT * FROM vouchers WHERE code = ? AND is_active = 1',
      [code.toUpperCase().trim()]
    );

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Mã voucher không tồn tại hoặc đã hết hiệu lực.' });
    }

    if (voucher.used_count >= voucher.usage_limit || !voucher.is_active) {
      return res.status(400).json({ success: false, message: 'Mã voucher này đã hết lượt sử dụng.' });
    }

    // Kiểm tra quyền sở hữu voucher cá nhân
    if (voucher.user_id && (!userId || voucher.user_id !== userId)) {
      return res.status(403).json({
        success: false,
        message: 'Mã voucher này thuộc quyền sở hữu của tài khoản thành viên khác.'
      });
    }

    const orderValue = parseFloat(subtotal) || 0;
    if (orderValue < voucher.min_order_value) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu phải từ ${new Intl.NumberFormat('vi-VN').format(voucher.min_order_value)}đ để áp dụng voucher này.`
      });
    }

    // Tính tiền giảm
    let discount = 0;
    if (voucher.discount_type === 'percent') {
      discount = (orderValue * voucher.discount_value) / 100;
      if (voucher.max_discount > 0 && discount > voucher.max_discount) {
        discount = voucher.max_discount;
      }
    } else {
      discount = voucher.discount_value;
    }

    res.json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công!',
      data: {
        code: voucher.code,
        description: voucher.description,
        discount_amount: Math.min(discount, orderValue)
      }
    });
  } catch (err) {
    next(err);
  }
}

// Admin: CRUD vouchers
async function getAllVouchersAdmin(req, res, next) {
  try {
    const vouchers = await dbAsync.all('SELECT * FROM vouchers ORDER BY id DESC');
    res.json({ success: true, data: vouchers });
  } catch (err) {
    next(err);
  }
}

async function createVoucher(req, res, next) {
  try {
    const { code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit } = req.body;
    if (!code || !discount_value) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin mã voucher hoặc giá trị giảm.' });
    }

    await dbAsync.run(
      `INSERT INTO vouchers (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code.toUpperCase().trim(), description || '', discount_type || 'fixed', discount_value, min_order_value || 0, max_discount || 0, usage_limit || 100]
    );

    res.status(201).json({ success: true, message: 'Đã tạo voucher thành công!' });
  } catch (err) {
    next(err);
  }
}

async function deleteVoucher(req, res, next) {
  try {
    const { id } = req.params;
    await dbAsync.run('DELETE FROM vouchers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xóa voucher.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailableVouchers,
  validateVoucher,
  getAllVouchersAdmin,
  createVoucher,
  deleteVoucher
};
