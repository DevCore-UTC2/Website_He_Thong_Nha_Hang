const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/me', authenticateToken, loyaltyController.getMyLoyalty);
router.post('/redeem', authenticateToken, loyaltyController.redeemPoints);

module.exports = router;
