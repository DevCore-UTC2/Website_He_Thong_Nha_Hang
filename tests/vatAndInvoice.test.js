/**
 * UNIT TESTS: BÓC TÁCH THUẾ VAT HAI MỨC & HÓA ĐƠN ĐIỆN TỬ
 * Kiểm thử các quy định trong HANDOFF Phase 4 (T18 - T25)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { getVatRate, splitVatFromGross, distributeLargestRemainder } = require('../server/config/tax');
const { isValidTaxId, isValidEmail } = require('../shared/validators');
const { dbAsync } = require('../server/config/db');
const { issueInvoiceForOrder, getInvoiceByOrderCode, lookupInvoice } = require('../server/services/invoiceService');

test('Thuế suất theo danh mục món ăn (8% thực phẩm, 10% đồ uống có cồn)', () => {
  assert.equal(getVatRate('food'), 0.08);
  assert.equal(getVatRate('non_alcohol'), 0.08);
  assert.equal(getVatRate('alcohol'), 0.10);
});

test('Ví dụ kiểm thử bắt buộc: Cơm tấm 140k (8%) + Rượu Gò Đen 150k (10%)', () => {
  const comTam = splitVatFromGross(140000, 0.08);
  assert.equal(comTam.amountBeforeVat, 129630);
  assert.equal(comTam.vatAmount, 10370);
  assert.equal(comTam.amountBeforeVat + comTam.vatAmount, 140000);

  const ruouGoDen = splitVatFromGross(150000, 0.10);
  assert.equal(ruouGoDen.amountBeforeVat, 136364);
  assert.equal(ruouGoDen.vatAmount, 13636);
  assert.equal(ruouGoDen.amountBeforeVat + ruouGoDen.vatAmount, 150000);

  const totalBeforeVat = comTam.amountBeforeVat + ruouGoDen.amountBeforeVat;
  const totalVat = comTam.vatAmount + ruouGoDen.vatAmount;
  const grandTotal = totalBeforeVat + totalVat;

  assert.equal(totalBeforeVat, 265994);
  assert.equal(totalVat, 24006);
  assert.equal(grandTotal, 290000);
});

test('Phân bổ giảm giá phần dư lớn nhất (Largest Remainder Method) khớp từng đồng VND', () => {
  const amounts = [140000, 150000];
  const discount = 30000;
  const allocated = distributeLargestRemainder(amounts, discount);

  assert.equal(allocated.length, 2);
  const totalAllocated = allocated.reduce((sum, v) => sum + v, 0);
  assert.equal(totalAllocated, discount);
  // Đảm bảo là các số nguyên
  assert.ok(Number.isInteger(allocated[0]));
  assert.ok(Number.isInteger(allocated[1]));
});

test('Xác thực Mã số thuế doanh nghiệp (Modulo 11 và MST Demo)', () => {
  // MST DEMO
  assert.equal(isValidTaxId('0000000000'), true);
  // MST 10 số chuẩn thuật toán Modulo 11
  assert.equal(isValidTaxId('0312345673'), true);
  assert.equal(isValidTaxId('0100109106'), true); // MST Tập đoàn Viettel
  // MST 13 số hợp lệ (chi nhánh)
  assert.equal(isValidTaxId('0312345673-001'), true);
  // MST sai chữ số kiểm tra (check digit 8 thay vì 3)
  assert.equal(isValidTaxId('0312345678'), false);
  // MST sai độ dài hoặc chứa chữ
  assert.equal(isValidTaxId('03123'), false);
  assert.equal(isValidTaxId('031234567A'), false);
});

test('Xác thực Email hợp lệ', () => {
  assert.equal(isValidEmail('ketoan@congty.com'), true);
  assert.equal(isValidEmail('khong-hop-le'), false);
  assert.equal(isValidEmail(''), false);
});

test('Cấp số hóa đơn tuần tự, lưu snapshot và tra cứu hóa đơn', async () => {
  // Tạo đơn hàng test
  const testOrderCode = `TEST-${Date.now()}`;
  const resOrder = await dbAsync.run(
    `INSERT INTO orders (
      order_code, customer_name, customer_phone, subtotal, total_before_vat,
      vat_8_amount, vat_10_amount, vat_amount, total_amount, payment_method,
      status, order_type
    ) VALUES (?, 'Nguyễn Văn Test', '0901234567', 290000, 265994, 10370, 13636, 24006, 290000, 'cash', 'received', 'dine_in')`,
    [testOrderCode]
  );
  const orderId = resOrder.id;

  const invoice = await issueInvoiceForOrder({
    dbAsync,
    orderId,
    orderCode: testOrderCode,
    buyerInfo: {
      buyer_name: 'Nguyễn Văn Test',
      buyer_phone: '0901234567',
      buyer_company_name: 'Công Ty TNHH Test',
      buyer_tax_id: '0312345678',
      buyer_address: '123 Đường Test, TP.HCM',
      buyer_email: 'ketoan@test.com'
    },
    amounts: {
      totalBeforeVat: 265994,
      vat8Amount: 10370,
      vat10Amount: 13636,
      totalVat: 24006,
      discountAmount: 0,
      totalAmount: 290000
    },
    validatedItems: [
      {
        dish_id: 1,
        dish_name: 'Cơm tấm Sài Gòn',
        dish_price: 140000,
        quantity: 1,
        item_total: 140000,
        vat_category: 'food',
        vat_rate: 0.08,
        amount_before_vat: 129630,
        vat_amount: 10370
      },
      {
        dish_id: 2,
        dish_name: 'Rượu Gò Đen Long An',
        dish_price: 150000,
        quantity: 1,
        item_total: 150000,
        vat_category: 'alcohol',
        vat_rate: 0.10,
        amount_before_vat: 136364,
        vat_amount: 13636
      }
    ],
    paymentMethod: 'cash'
  });

  assert.ok(invoice.invoice_number > 0);
  assert.equal(invoice.formatted_number.length, 8);
  assert.equal(invoice.total_amount, 290000);
  assert.equal(invoice.total_amount_in_words, 'Hai trăm chín mươi nghìn đồng');

  // Kiểm tra lấy hóa đơn theo orderCode
  const fetched = await getInvoiceByOrderCode(dbAsync, testOrderCode);
  assert.ok(fetched);
  assert.equal(fetched.order_code, testOrderCode);
  assert.equal(fetched.items.length, 2);
  assert.equal(fetched.buyer_company_name, 'Công Ty TNHH Test');

  // Kiểm tra tra cứu hóa đơn với 4 số cuối SĐT (4567)
  const lookupSuccess = await lookupInvoice(dbAsync, testOrderCode, '4567');
  assert.ok(lookupSuccess);
  assert.equal(lookupSuccess.order_code, testOrderCode);

  // Tra cứu sai số điện thoại phải trả về null
  const lookupFail = await lookupInvoice(dbAsync, testOrderCode, '9999');
  assert.equal(lookupFail, null);

  // Xóa đơn test để giữ sạch database
  await dbAsync.run('DELETE FROM invoices WHERE order_id = ?', [orderId]);
  await dbAsync.run('DELETE FROM orders WHERE id = ?', [orderId]);
});
