/**
 * AUTH ROUTES — VỊ NHÀ MÌNH
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/check-phone', authController.checkPhone);
router.post('/check-phone', authController.checkPhone);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
