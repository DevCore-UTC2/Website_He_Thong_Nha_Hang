/**
 * TEST SUITE: TASK 3 - QUYỀN TRUY CẬP VÀ XUẤT HÓA ĐƠN VAT
 * Kiểm tra 4 trường hợp:
 * (a) Đơn khách vãng lai: tra cứu bình thường không cần đăng nhập hay SĐT
 * (b) Đơn thành viên khi đã đăng nhập (chính chủ): truy cập thành công
 * (c) Đơn thành viên khi chưa đăng nhập nhưng nhập đúng SĐT: truy cập thành công
 * (d) Sai SĐT hoặc không có SĐT đối với đơn thành viên: bị từ chối 403 rõ ràng
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { app } = require('../server/app');
const { dbAsync } = require('../server/config/db');
const { issueInvoiceForOrder } = require('../server/services/invoiceService');

function invoke(method, url, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new (require('net').Socket)();
    socket.remoteAddress = '127.0.0.1';
    const req = new http.IncomingMessage(socket);
    req.ip = '127.0.0.1';
    req.socket = socket;
    req.connection = socket;
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost:5000', ...headers };
    if (body) {
      req.headers['content-type'] = 'application/json';
      const bodyStr = JSON.stringify(body);
      req.headers['content-length'] = Buffer.byteLength(bodyStr);
      req.push(bodyStr);
    }
    req.push(null);

    const res = new http.ServerResponse(req);
    let output = '';
    res.write = function (chunk) {
      if (chunk) output += chunk.toString();
      return true;
    };
    res.end = function (chunk) {
      if (chunk) output += chunk.toString();
      let parsed = null;
      try {
        parsed = JSON.parse(output);
      } catch (e) {
        parsed = output;
      }
      resolve({ status: res.statusCode, data: parsed });
    };

    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

describe('TASK 3: Phân quyền truy cập và xuất hóa đơn VAT', () => {
  let memberOrderCode = `TEST-MEM-${Date.now()}`;
  let guestOrderCode = `TEST-GUEST-${Date.now()}`;
  let memberOrderId, guestOrderId;
  let memberToken;
  let otherToken;

  before(async () => {
    // 1. Đăng nhập member
    const loginRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'khach@gmail.com', password: 'Khach@1234' }
    });
    assert.strictEqual(loginRes.status, 200);
    memberToken = loginRes.data.data.token;
    const memberUserId = loginRes.data.data.user.id;

    // 2. Tạo đơn thành viên
    const resMemOrder = await dbAsync.run(
      `INSERT INTO orders (
        order_code, user_id, customer_name, customer_phone, subtotal, total_before_vat,
        vat_8_amount, vat_10_amount, vat_amount, total_amount, payment_method,
        status, order_type
      ) VALUES (?, ?, 'Nguyễn Văn Thành Viên', '0908765432', 290000, 265994, 10370, 13636, 24006, 290000, 'cash', 'received', 'dine_in')`,
      [memberOrderCode, memberUserId]
    );
    memberOrderId = resMemOrder.id;

    await issueInvoiceForOrder({
      dbAsync,
      orderId: memberOrderId,
      orderCode: memberOrderCode,
      buyerInfo: {
        buyer_name: 'Nguyễn Văn Thành Viên',
        buyer_phone: '0908765432',
        buyer_company_name: 'Công Ty Thành Viên',
        buyer_tax_id: '0312345673',
        buyer_address: 'Quận 1, TP.HCM',
        buyer_email: 'khach@vinhaminh.vn'
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
          dish_name: 'Rượu Gò Đen',
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

    // 3. Tạo đơn khách vãng lai (user_id = null)
    const resGuestOrder = await dbAsync.run(
      `INSERT INTO orders (
        order_code, user_id, customer_name, customer_phone, subtotal, total_before_vat,
        vat_8_amount, vat_10_amount, vat_amount, total_amount, payment_method,
        status, order_type
      ) VALUES (?, NULL, 'Khách Vãng Lai Test', '0919998888', 140000, 129630, 10370, 0, 10370, 140000, 'cash', 'received', 'dine_in')`,
      [guestOrderCode]
    );
    guestOrderId = resGuestOrder.id;

    await issueInvoiceForOrder({
      dbAsync,
      orderId: guestOrderId,
      orderCode: guestOrderCode,
      buyerInfo: {
        buyer_name: 'Khách Vãng Lai Test',
        buyer_phone: '0919998888',
        buyer_address: 'Tại bàn'
      },
      amounts: {
        totalBeforeVat: 129630,
        vat8Amount: 10370,
        vat10Amount: 0,
        totalVat: 10370,
        discountAmount: 0,
        totalAmount: 140000
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
        }
      ],
      paymentMethod: 'cash'
    });
  });

  after(async () => {
    // Dọn dẹp dữ liệu kiểm thử
    if (memberOrderId) {
      await dbAsync.run('DELETE FROM invoices WHERE order_id = ?', [memberOrderId]);
      await dbAsync.run('DELETE FROM orders WHERE id = ?', [memberOrderId]);
    }
    if (guestOrderId) {
      await dbAsync.run('DELETE FROM invoices WHERE order_id = ?', [guestOrderId]);
      await dbAsync.run('DELETE FROM orders WHERE id = ?', [guestOrderId]);
    }
  });

  test('(a) Đơn khách vãng lai: tra cứu thành công không cần đăng nhập hay SĐT', async () => {
    const res = await invoke('GET', `/api/invoices/by-order/${guestOrderCode}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.order_code, guestOrderCode);
    assert.strictEqual(res.data.data.total_amount, 140000);
    assert.strictEqual(res.data.data.items.length, 1);
  });

  test('(b) Đơn thành viên khi đã đăng nhập (chính chủ): truy cập thành công', async () => {
    const res = await invoke('GET', `/api/invoices/by-order/${memberOrderCode}`, {
      headers: { authorization: `Bearer ${memberToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.order_code, memberOrderCode);
    assert.strictEqual(res.data.data.total_amount, 290000);
    assert.strictEqual(res.data.data.items.length, 2);
  });

  test('(c) Đơn thành viên khi chưa đăng nhập nhưng nhập đúng SĐT: truy cập thành công', async () => {
    // Thử với đầy đủ số điện thoại 0908765432
    const resFull = await invoke('GET', `/api/invoices/by-order/${memberOrderCode}?phone=0908765432`);
    assert.strictEqual(resFull.status, 200);
    assert.strictEqual(resFull.data.success, true);
    assert.strictEqual(resFull.data.data.order_code, memberOrderCode);
    assert.strictEqual(resFull.data.data.total_amount, 290000);

    // Thử với 4 số cuối: 5432
    const resLast4 = await invoke('GET', `/api/invoices/by-order/${memberOrderCode}?phone=5432`);
    assert.strictEqual(resLast4.status, 200);
    assert.strictEqual(resLast4.data.success, true);
    assert.strictEqual(resLast4.data.data.order_code, memberOrderCode);

    // Thử qua header X-Customer-Phone
    const resHeader = await invoke('GET', `/api/invoices/by-order/${memberOrderCode}`, {
      headers: { 'x-customer-phone': '5432' }
    });
    assert.strictEqual(resHeader.status, 200);
    assert.strictEqual(resHeader.data.success, true);
  });

  test('(d) Sai SĐT hoặc không nhập SĐT đối với đơn thành viên: bị từ chối 403 rõ ràng', async () => {
    // Không có token và không có SĐT
    const resNoAuth = await invoke('GET', `/api/invoices/by-order/${memberOrderCode}`);
    assert.strictEqual(resNoAuth.status, 403);
    assert.strictEqual(resNoAuth.data.success, false);
    assert.ok(resNoAuth.data.message.includes('thành viên') || resNoAuth.data.message.includes('số điện thoại'));

    // Nhập sai SĐT
    const resWrongPhone = await invoke('GET', `/api/invoices/by-order/${memberOrderCode}?phone=9999`);
    assert.strictEqual(resWrongPhone.status, 403);
    assert.strictEqual(resWrongPhone.data.success, false);
    assert.ok(resWrongPhone.data.message.includes('không chính xác') || resWrongPhone.data.message.includes('không đúng'));
  });
});
