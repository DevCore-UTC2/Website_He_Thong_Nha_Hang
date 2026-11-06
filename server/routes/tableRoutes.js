const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/', tableController.getTables);
router.get('/by-token/:token', tableController.getTableByToken);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'staff'), tableController.updateTableStatus);

module.exports = router;
