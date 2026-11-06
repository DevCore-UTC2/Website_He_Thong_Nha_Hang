const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, optionalToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/', optionalToken, orderController.createOrder);
router.get('/track/:code', optionalToken, orderController.getOrderTracking);
router.post('/:id/cancel', optionalToken, orderController.cancelOrder);
router.get('/my-orders', authenticateToken, orderController.getMyOrders);

// Nhân viên & Bếp
router.get('/kitchen', authenticateToken, authorizeRoles('admin', 'staff'), orderController.getKitchenOrders);
router.patch('/items/:id/status', authenticateToken, authorizeRoles('admin', 'staff'), orderController.updateOrderItemStatus);
router.patch('/kitchen/items/:id/status', authenticateToken, authorizeRoles('admin', 'staff'), orderController.updateOrderItemStatus);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'staff'), orderController.updateOrderStatus);

module.exports = router;
