/**
 * REVIEW CONTROLLER (Mục 13: Đánh giá món ăn & duyệt bình luận)
 * Áp dụng skills: backend-development-feature-development, sql-pro
 */

const { dbAsync } = require('../config/db');

// Lấy danh sách đánh giá của món ăn (Công khai)
async function getDishReviews(req, res, next) {
  try {
    const { dishId } = req.params;
    const reviews = await dbAsync.all(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.dish_id = ? AND r.is_approved = 1 
       ORDER BY r.id DESC`,
      [dishId]
    );

    // Tính thống kê sao
    let sum = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      sum += r.rating;
      if (ratingDistribution[r.rating] !== undefined) ratingDistribution[r.rating]++;
    });

    const avg = reviews.length > 0 ? (sum / reviews.length).toFixed(1) : 5.0;

    res.json({
      success: true,
      data: {
        reviews,
        total: reviews.length,
        average: parseFloat(avg),
        distribution: ratingDistribution
      }
    });
  } catch (err) {
    next(err);
  }
}

// Khách hàng gửi đánh giá (Chỉ cho khách đã mua đánh giá)
async function submitReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { dish_id, rating, comment } = req.body;

    if (!dish_id || !rating) {
      return res.status(400).json({ success: false, message: 'Thiếu món ăn hoặc số sao đánh giá.' });
    }

    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5.' });
    }

    // Kiểm tra xem khách đã từng đặt món này chưa
    const hasOrdered = await dbAsync.get(
      `SELECT oi.id 
       FROM order_items oi 
       JOIN orders o ON oi.order_id = o.id 
       WHERE o.user_id = ? AND oi.dish_id = ?`,
      [userId, dish_id]
    );

    if (!hasOrdered) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể đánh giá những món ăn mà bạn đã từng trải nghiệm và đặt thành công.'
      });
    }

    const user = await dbAsync.get('SELECT name FROM users WHERE id = ?', [userId]);

    await dbAsync.run(
      `INSERT INTO reviews (user_id, dish_id, customer_name, rating, comment, is_approved)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [userId, dish_id, user ? user.name : 'Khách', rating, comment || '']
    );

    // Tự động tính lại điểm trung bình cho món ăn
    const stats = await dbAsync.get(
      'SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews WHERE dish_id = ? AND is_approved = 1',
      [dish_id]
    );

    if (stats) {
      await dbAsync.run(
        'UPDATE dishes SET rating_avg = ?, rating_count = ? WHERE id = ?',
        [parseFloat(stats.avgRating.toFixed(1)), stats.count, dish_id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá!'
    });
  } catch (err) {
    next(err);
  }
}

// Admin: Lấy danh sách toàn bộ đánh giá để duyệt / ẩn
async function getAllReviewsAdmin(req, res, next) {
  try {
    const list = await dbAsync.all(
      `SELECT r.*, d.name as dish_name 
       FROM reviews r 
       LEFT JOIN dishes d ON r.dish_id = d.id 
       ORDER BY r.id DESC`
    );
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function toggleReviewApproval(req, res, next) {
  try {
    const { id } = req.params;
    const review = await dbAsync.get('SELECT is_approved FROM reviews WHERE id = ?', [id]);
    if (!review) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });

    const nextStatus = review.is_approved === 1 ? 0 : 1;
    await dbAsync.run('UPDATE reviews SET is_approved = ? WHERE id = ?', [nextStatus, id]);

    res.json({ success: true, message: nextStatus === 1 ? 'Đã duyệt hiển thị đánh giá.' : 'Đã ẩn đánh giá.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDishReviews,
  submitReview,
  getAllReviewsAdmin,
  toggleReviewApproval
};
