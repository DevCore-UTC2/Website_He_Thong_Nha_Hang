const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/dish/:dishId', reviewController.getDishReviews);
router.post('/', authenticateToken, reviewController.submitReview);

// Admin duyệt đánh giá
router.get('/admin/all', authenticateToken, authorizeRoles('admin'), reviewController.getAllReviewsAdmin);
router.patch('/admin/:id/toggle', authenticateToken, authorizeRoles('admin'), reviewController.toggleReviewApproval);

module.exports = router;
