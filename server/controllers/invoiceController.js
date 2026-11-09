/**
 * INVOICE CONTROLLER — VỊ NHÀ MÌNH
 * Phục vụ tra cứu, hiển thị chi tiết hóa đơn điện tử theo Nghị định 123/2020/NĐ-CP
 */

const { dbAsync } = require('../config/db');
const { getInvoiceByOrderCode, lookupInvoice } = require('../services/invoiceService');

/**
 * Lấy chi tiết hóa đơn theo mã đơn hàng (orderCode)
 */
async function getInvoiceByOrder(req, res, next) {
  try {
    const { orderCode } = req.params;
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: 'Mã đơn hàng không được để trống.'
      });
    }

    const invoice = await getInvoiceByOrderCode(dbAsync, orderCode);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hóa đơn điện tử cho đơn hàng ${orderCode}.`
      });
    }

    // Kiểm tra quyền truy cập hóa đơn (bảo vệ quyền riêng tư)
    const order = await dbAsync.get('SELECT user_id, customer_phone FROM orders WHERE id = ?', [invoice.order_id]);
    if (order && order.user_id) {
      const currentUser = req.user;
      const isStaffOrAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff');
      if (!isStaffOrAdmin) {
        // Nếu là chính chủ tài khoản thành viên đã đăng nhập
        if (currentUser && currentUser.id === order.user_id) {
          // Cho phép truy cập
        } else {
          // Khách chưa đăng nhập hoặc đăng nhập tài khoản khác: xác thực qua SĐT đặt hàng
          const phone = req.query.phone || req.headers['x-customer-phone'];
          const inputPhone = phone ? String(phone).trim() : '';
          const orderPhone = String(order.customer_phone || '').trim();
          const buyerPhone = String(invoice.buyer_phone || '').trim();
          const inputDigits = inputPhone.replace(/\D/g, '');
          const orderDigits = orderPhone.replace(/\D/g, '');
          const buyerDigits = buyerPhone.replace(/\D/g, '');

          const isMatch = Boolean(
            inputDigits &&
            inputDigits.length >= 4 &&
            (orderDigits.endsWith(inputDigits) ||
             buyerDigits.endsWith(inputDigits) ||
             orderDigits === inputDigits ||
             buyerDigits === inputDigits)
          );

          if (!inputDigits) {
            return res.status(403).json({
              success: false,
              message: 'Hóa đơn này thuộc đơn hàng của tài khoản thành viên. Vui lòng đăng nhập hoặc xác thực đúng số điện thoại đặt hàng.'
            });
          }

          if (!isMatch) {
            return res.status(403).json({
              success: false,
              message: 'Số điện thoại xác thực không chính xác. Vui lòng nhập đúng số điện thoại đặt hàng.'
            });
          }
        }
      }
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Tra cứu hóa đơn bằng mã đơn hàng và 4 số cuối số điện thoại
 */
async function handleLookupInvoice(req, res, next) {
  try {
    const orderCode = req.query.order_code || req.body.order_code;
    const phoneLast4 = req.query.phone_last4 || req.body.phone_last4;

    if (!orderCode || !phoneLast4) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã đơn hàng và 4 số cuối số điện thoại.'
      });
    }

    if (!/^\d{4}$/.test(String(phoneLast4).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại tra cứu phải là 4 chữ số cuối.'
      });
    }

    const invoice = await lookupInvoice(dbAsync, orderCode, phoneLast4);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn phù hợp với mã đơn và số điện thoại đã cung cấp.'
      });
    }

    res.json({
      success: true,
      message: 'Tra cứu hóa đơn thành công.',
      data: invoice
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Lấy hóa đơn theo số hóa đơn (invoice_number)
 */
async function getInvoiceByNumber(req, res, next) {
  try {
    const num = parseInt(req.params.invoiceNumber, 10);
    if (isNaN(num)) {
      return res.status(400).json({
        success: false,
        message: 'Số hóa đơn không hợp lệ.'
      });
    }

    const invoice = await dbAsync.get('SELECT * FROM invoices WHERE invoice_number = ?', [num]);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hóa đơn số ${num}.`
      });
    }

    try {
      invoice.items = JSON.parse(invoice.items_snapshot);
    } catch {
      invoice.items = [];
    }
    invoice.formatted_number = String(invoice.invoice_number).padStart(8, '0');

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInvoiceByOrder,
  handleLookupInvoice,
  getInvoiceByNumber
};
