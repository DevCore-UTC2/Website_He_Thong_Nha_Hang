/**
 * INVOICE SERVICE — VỊ NHÀ MÌNH
 * Quản lý xuất hóa đơn điện tử theo Nghị định 123/2020/NĐ-CP
 * - Cấp số hóa đơn tuần tự, không nhảy số, không trùng lặp trong SQLite transaction.
 * - Lưu snapshot thông tin người bán (DEMO), người mua, danh sách món và bóc tách thuế VAT.
 * - Chuyển đổi số tiền thành chữ tiếng Việt chuẩn xác từng đồng VND.
 */

const seller = require('../config/seller');
const { readMoneyVND } = require('../../shared/currencyToWords');

/**
 * Cấp và lưu hóa đơn điện tử cho đơn hàng bên trong SQLite transaction
 * @param {object} params
 * @param {object} params.dbAsync
 * @param {number} params.orderId
 * @param {string} params.orderCode
 * @param {object} params.buyerInfo
 * @param {object} params.amounts
 * @param {Array}  params.validatedItems
 * @param {string} params.paymentMethod
 * @returns {Promise<object>} Bản ghi hóa đơn đã tạo
 */
async function issueInvoiceForOrder({
  dbAsync,
  orderId,
  orderCode,
  buyerInfo,
  amounts,
  validatedItems,
  paymentMethod
}) {
  // 1. Cấp số hóa đơn tăng tuần tự (không trùng lặp, chạy trong transaction)
  const maxRow = await dbAsync.get('SELECT COALESCE(MAX(invoice_number), 0) + 1 AS next_number FROM invoices');
  const invoiceNumber = maxRow ? maxRow.next_number : 1;
  const formattedNumber = String(invoiceNumber).padStart(8, '0');

  // 2. Chuẩn bị snapshot danh sách món ăn
  const itemsSnapshot = (validatedItems || []).map((it, idx) => ({
    line_number: idx + 1,
    dish_id: it.dish_id,
    dish_name: it.dish_name,
    quantity: it.quantity,
    unit_price: it.dish_price,
    item_total: it.item_total,
    discount_allocated: it.discount_allocated || 0,
    amount_before_vat: it.amount_before_vat,
    vat_category: it.vat_category || 'food',
    vat_rate: it.vat_rate,
    vat_amount: it.vat_amount
  }));

  const totalAmount = Math.max(0, Math.round(amounts.totalAmount));
  const amountInWords = readMoneyVND(totalAmount);

  // 3. Thông tin người mua snapshot
  const buyerName = buyerInfo.buyer_company_name 
    ? buyerInfo.buyer_company_name.trim() 
    : (buyerInfo.buyer_name ? buyerInfo.buyer_name.trim() : 'Khách hàng');
  const buyerPhone = buyerInfo.buyer_phone ? buyerInfo.buyer_phone.trim() : null;
  const buyerTaxId = buyerInfo.buyer_tax_id ? buyerInfo.buyer_tax_id.trim() : null;
  const buyerCompanyName = buyerInfo.buyer_company_name ? buyerInfo.buyer_company_name.trim() : null;
  const buyerAddress = buyerInfo.buyer_address ? buyerInfo.buyer_address.trim() : null;
  const buyerEmail = buyerInfo.buyer_email ? buyerInfo.buyer_email.trim() : null;

  // 4. Lưu bản ghi hóa đơn
  const res = await dbAsync.run(
    `INSERT INTO invoices (
      order_id, order_code, invoice_number, template_code, serial_code,
      seller_name, seller_tax_id, seller_address, seller_phone, seller_email,
      buyer_name, buyer_phone, buyer_tax_id, buyer_company_name, buyer_address, buyer_email,
      total_before_vat, vat_8_amount, vat_10_amount, total_vat, discount_amount,
      total_amount, total_amount_in_words, payment_method, items_snapshot,
      is_demo, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued')`,
    [
      orderId,
      orderCode,
      invoiceNumber,
      seller.invoiceTemplate || '1',
      seller.invoiceSerial || 'C26MDM',
      seller.invoiceName,
      seller.taxId,
      seller.address,
      seller.phone,
      seller.email,
      buyerName,
      buyerPhone,
      buyerTaxId,
      buyerCompanyName,
      buyerAddress,
      buyerEmail,
      amounts.totalBeforeVat,
      amounts.vat8Amount,
      amounts.vat10Amount,
      amounts.totalVat,
      amounts.discountAmount || 0,
      totalAmount,
      amountInWords,
      paymentMethod,
      JSON.stringify(itemsSnapshot),
      seller.isDemo ? 1 : 0
    ]
  );

  // 5. Đồng bộ invoice_number vào bảng orders
  await dbAsync.run('UPDATE orders SET invoice_number = ? WHERE id = ?', [invoiceNumber, orderId]);

  return {
    id: res.id,
    order_id: orderId,
    order_code: orderCode,
    invoice_number: invoiceNumber,
    formatted_number: formattedNumber,
    template_code: seller.invoiceTemplate || '1',
    serial_code: seller.invoiceSerial || 'C26MDM',
    total_amount: totalAmount,
    total_amount_in_words: amountInWords
  };
}

/**
 * Lấy chi tiết hóa đơn theo orderCode
 * @param {object} dbAsync
 * @param {string} orderCode
 * @returns {Promise<object|null>}
 */
async function getInvoiceByOrderCode(dbAsync, orderCode) {
  const invoice = await dbAsync.get('SELECT * FROM invoices WHERE order_code = ?', [orderCode]);
  if (!invoice) return null;

  try {
    invoice.items = JSON.parse(invoice.items_snapshot);
  } catch {
    invoice.items = [];
  }
  invoice.formatted_number = String(invoice.invoice_number).padStart(8, '0');
  return invoice;
}

/**
 * Tra cứu hóa đơn theo order_code và 4 số cuối số điện thoại
 * @param {object} dbAsync
 * @param {string} orderCode
 * @param {string} phoneLast4
 * @returns {Promise<object|null>}
 */
async function lookupInvoice(dbAsync, orderCode, phoneLast4) {
  if (!orderCode || !phoneLast4) return null;

  const invoice = await getInvoiceByOrderCode(dbAsync, orderCode.trim());
  if (!invoice) return null;

  // Kiểm tra 4 số cuối SĐT người mua hoặc SĐT trong đơn hàng
  const cleanLast4 = phoneLast4.trim();
  let phoneMatch = false;

  if (invoice.buyer_phone) {
    const rawDigits = invoice.buyer_phone.replace(/\D/g, '');
    if (rawDigits.endsWith(cleanLast4)) {
      phoneMatch = true;
    }
  }

  if (!phoneMatch) {
    const order = await dbAsync.get('SELECT customer_phone FROM orders WHERE order_code = ?', [orderCode.trim()]);
    if (order && order.customer_phone) {
      const rawDigits = order.customer_phone.replace(/\D/g, '');
      if (rawDigits.endsWith(cleanLast4)) {
        phoneMatch = true;
      }
    }
  }

  return phoneMatch ? invoice : null;
}

module.exports = {
  issueInvoiceForOrder,
  getInvoiceByOrderCode,
  lookupInvoice
};
