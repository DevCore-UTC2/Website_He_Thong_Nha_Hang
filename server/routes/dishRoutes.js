/**
 * DISH ROUTES
 */
const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Công khai (Mục 3: Xem thực đơn, Mục 4: Chi tiết món)
router.get('/', dishController.getDishes);
router.get('/:id', dishController.getDishById);

// Quản trị (Mục 2: Admin quản lý món ăn)
router.post('/', authenticateToken, authorizeRoles('admin', 'staff'), dishController.createDish);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'staff'), dishController.updateDish);
router.patch('/:id/toggle-status', authenticateToken, authorizeRoles('admin', 'staff'), dishController.toggleDishAvailability);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), dishController.deleteDish);

module.exports = router;
