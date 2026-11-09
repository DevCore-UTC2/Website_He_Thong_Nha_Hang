/**
 * INVOICE ROUTES — VỊ NHÀ MÌNH
 */

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { optionalToken } = require('../middlewares/authMiddleware');

// Tra cứu hóa đơn (hỗ trợ cả GET và POST)
router.get('/lookup', invoiceController.handleLookupInvoice);
router.post('/lookup', invoiceController.handleLookupInvoice);

// Lấy chi tiết hóa đơn theo orderCode (kèm kiểm tra quyền truy cập)
router.get('/by-order/:orderCode', optionalToken, invoiceController.getInvoiceByOrder);

// Lấy chi tiết hóa đơn theo invoiceNumber
router.get('/number/:invoiceNumber', invoiceController.getInvoiceByNumber);

module.exports = router;
