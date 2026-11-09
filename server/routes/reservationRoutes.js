const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticateToken, optionalToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/', optionalToken, reservationController.createReservation);
router.get('/', authenticateToken, authorizeRoles('admin', 'staff'), reservationController.getReservations);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'staff'), reservationController.updateReservationStatus);

module.exports = router;
