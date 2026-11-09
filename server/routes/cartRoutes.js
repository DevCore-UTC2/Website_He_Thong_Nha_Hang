/**
 * CART ROUTES
 */
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, cartController.getCart);
router.post('/sync', authenticateToken, cartController.syncCart);

module.exports = router;
