const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const { authenticateToken, optionalToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/', optionalToken, voucherController.getAvailableVouchers);
router.post('/validate', optionalToken, voucherController.validateVoucher);

// Admin
router.get('/all', authenticateToken, authorizeRoles('admin'), voucherController.getAllVouchersAdmin);
router.post('/', authenticateToken, authorizeRoles('admin'), voucherController.createVoucher);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), voucherController.deleteVoucher);

module.exports = router;
