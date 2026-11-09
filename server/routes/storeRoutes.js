/**
 * STORE ROUTES — VỊ NHÀ MÌNH
 */

const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Truy vấn trạng thái mở/đóng cửa (Công khai)
router.get('/status', storeController.getStatus);

// Cập nhật trạng thái mở/đóng cửa (Chỉ Admin)
router.put('/status', authenticateToken, authorizeRoles('admin'), storeController.updateStatus);

module.exports = router;
