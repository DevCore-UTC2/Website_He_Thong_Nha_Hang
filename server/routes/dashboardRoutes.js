const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/stats', authenticateToken, authorizeRoles('admin'), dashboardController.getDashboardStats);
router.get('/export-csv', authenticateToken, authorizeRoles('admin'), dashboardController.exportCsv);

module.exports = router;
