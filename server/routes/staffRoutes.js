const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffManagerController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/staff', authenticateToken, authorizeRoles('admin'), staffController.getStaffList);
router.post('/staff', authenticateToken, authorizeRoles('admin'), staffController.createStaffUser);
router.patch('/role/:id', authenticateToken, authorizeRoles('admin'), staffController.updateRole);
router.patch('/lock/:id', authenticateToken, authorizeRoles('admin'), staffController.toggleUserLock);
router.get('/customers', authenticateToken, authorizeRoles('admin'), staffController.getCustomerList);

module.exports = router;
