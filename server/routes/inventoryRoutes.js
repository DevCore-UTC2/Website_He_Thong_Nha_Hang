const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, authorizeRoles('admin', 'staff'), inventoryController.getInventory);
router.post('/import-export/:id', authenticateToken, authorizeRoles('admin', 'staff'), inventoryController.updateStock);
router.post('/', authenticateToken, authorizeRoles('admin'), inventoryController.createIngredient);

module.exports = router;
