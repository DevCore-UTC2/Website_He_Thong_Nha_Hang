/**
 * LOYALTY CONTROLLER (Mục 12: Điểm thành viên & Hạng thành viên)
 * Áp dụng skills: backend-development-feature-development, sql-pro
 */

const { dbAsync } = require('../config/db');

// Lấy thông tin điểm và hạng thành viên
async function getMyLoyalty(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await dbAsync.get('SELECT loyalty_points FROM users WHERE id = ?', [userId]);
    const points = user ? (user.loyalty_points || 0) : 0;

    // Xác định hạng thành viên
    let tier = 'Đồng';
    let nextTierPoints = 200;
    let discountRate = 0;

    if (points >= 1000) {
      tier = 'Kim Cương';
      nextTierPoints = 1000;
      discountRate = 15;
    } else if (points >= 500) {
      tier = 'Vàng';
      nextTierPoints = 1000;
      discountRate = 10;
    } else if (points >= 200) {
      tier = 'Bạc';
      nextTierPoints = 500;
      discountRate = 5;
    }

    res.json({
      success: true,
      data: {
        points,
        tier,
        discountRate,
        nextTierPoints
      }
    });
  } catch (err) {
    next(err);
  }
}

// Đổi điểm lấy voucher
async function redeemPoints(req, res, next) {
  try {
    const userId = req.user.id;
    const { voucher_value } = req.body; // 20000đ (200 điểm) hoặc 50000đ (500 điểm)

    const val = parseInt(voucher_value, 10);
    if (val !== 20000 && val !== 50000) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị voucher quy đổi không hợp lệ (hỗ trợ gói 20.000đ hoặc 50.000đ).'
      });
    }

    const requiredPoints = val === 50000 ? 500 : 200;
    const user = await dbAsync.get('SELECT loyalty_points FROM users WHERE id = ?', [userId]);

    if (!user || user.loyalty_points < requiredPoints) {
      return res.status(400).json({ success: false, message: 'Bạn không đủ điểm thưởng để thực hiện quy đổi.' });
    }

    // Trừ điểm và sinh mã voucher độc quyền
    const voucherCode = `LOYALTY-${Math.floor(1000 + Math.random() * 9000)}`;
    await dbAsync.run('UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ?', [requiredPoints, userId]);

    await dbAsync.run(
      `INSERT INTO vouchers (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, used_count, user_id, is_active)
       VALUES (?, 'Voucher đổi từ điểm thưởng thành viên', 'fixed', ?, ?, ?, 1, 0, ?, 1)`,
      [voucherCode, voucher_value, voucher_value * 2, voucher_value, userId]
    );

    res.json({
      success: true,
      message: `Đổi thành công mã voucher: ${voucherCode} trị giá ${new Intl.NumberFormat('vi-VN').format(voucher_value)}đ!`,
      data: { voucherCode }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyLoyalty,
  redeemPoints
};
