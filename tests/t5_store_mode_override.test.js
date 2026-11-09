/**
 * TEST SUITE: STORE MODE OVERRIDE (ADMIN MỞ/ĐÓNG CỬA & QUYỀN ĐẶT ĐƠN)
 * Kiểm tra các yêu cầu:
 * 1. Khi quản trị viên bấm mở (force_open): Dù là mấy giờ (ngoài giờ phục vụ) đều cho phép đặt đơn.
 * 2. Khi quản trị viên bấm đóng (force_closed): Dù là trong giờ hoạt động hay test mode đều không cho đặt đơn.
 * 3. Khi ở chế độ tự động (auto): Áp dụng khung giờ nhận đơn 09:00 - 21:30.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { app, server } = require('../server/app');
const { dbAsync } = require('../server/config/db');
const { getStoreStatus, setStoreMode, isOrderAccepting } = require('../server/services/storeStatusService');

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

describe('Store Mode Override: Mở/Đóng cửa cưỡng bức & Đặt đơn', () => {
  let adminToken = '';
  let availableDish = null;

  before(async () => {
    // Đăng nhập Admin lấy token
    const loginRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'admin@vinhaminh.vn', password: 'Admin@1234' }
    });
    assert.strictEqual(loginRes.status, 200, 'Admin đăng nhập thành công');
    adminToken = loginRes.data.data.token;

    // Lấy 1 món ăn khả dụng
    availableDish = await dbAsync.get('SELECT id, name, price FROM dishes WHERE is_available = 1 LIMIT 1');
    assert.ok(availableDish, 'Cần có ít nhất 1 món ăn trong CSDL');
  });

  after(async () => {
    // Khôi phục về chế độ auto sau khi kết thúc test
    await setStoreMode('auto', 'test-cleanup');
    if (server) {
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      if (typeof server.close === 'function') server.close();
    }
  });

  test('1. Khi Admin chọn MỞ (force_open): isOrderAccepting() luôn allowed: true bất kể thời gian', async () => {
    await setStoreMode('force_open', 'admin');
    const status = getStoreStatus();
    assert.strictEqual(status.mode, 'force_open');
    assert.strictEqual(status.is_open, true);

    const check = isOrderAccepting();
    assert.strictEqual(check.allowed, true);

    // Thử gửi yêu cầu tạo đơn hàng qua API POST /api/orders
    const orderRes = await invoke('POST', '/api/orders', {
      body: {
        order_type: 'takeaway',
        customer_name: 'Khách Đặt Đêm Khuya',
        customer_phone: '0901234567',
        items: [
          { dish_id: availableDish.id, quantity: 1, spice_level: 0 }
        ],
        payment_method: 'cash'
      }
    });

    assert.strictEqual(orderRes.status, 201, 'Đặt đơn thành công khi force_open');
    assert.strictEqual(orderRes.data.success, true);
    assert.ok(orderRes.data.data.order_code);

    // Dọn dẹp đơn vừa tạo
    if (orderRes.data.data.id) {
      await dbAsync.run('DELETE FROM order_items WHERE order_id = ?', [orderRes.data.data.id]);
      await dbAsync.run('DELETE FROM orders WHERE id = ?', [orderRes.data.data.id]);
    }
  });

  test('2. Khi Admin chọn ĐÓNG (force_closed): isOrderAccepting() luôn allowed: false và chặn đặt đơn', async () => {
    // Đổi qua API bằng Admin token
    const putRes = await invoke('PUT', '/api/store/status', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { mode: 'force_closed' }
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.data.data.mode, 'force_closed');
    assert.strictEqual(putRes.data.data.is_open, false);

    const check = isOrderAccepting();
    assert.strictEqual(check.allowed, false);
    assert.ok(check.message.includes('tạm đóng cửa'));

    // Thử gửi yêu cầu tạo đơn hàng qua API POST /api/orders -> Phải bị chặn 400
    const orderRes = await invoke('POST', '/api/orders', {
      body: {
        order_type: 'takeaway',
        customer_name: 'Khách Đặt Lúc Đóng',
        customer_phone: '0901234567',
        items: [
          { dish_id: availableDish.id, quantity: 1, spice_level: 0 }
        ],
        payment_method: 'cash'
      }
    });

    assert.strictEqual(orderRes.status, 400, 'Bị từ chối 400 khi force_closed');
    assert.strictEqual(orderRes.data.success, false);
    assert.ok(orderRes.data.message.includes('tạm đóng cửa') || orderRes.data.message.includes('chỉ đạo của Quản trị viên'));
  });

  test('3. Khi Admin chọn TỰ ĐỘNG (auto): Khôi phục chế độ theo giờ hoạt động chuẩn 09:00 - 21:30', async () => {
    const putRes = await invoke('PUT', '/api/store/status', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { mode: 'auto' }
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.data.data.mode, 'auto');

    const status = getStoreStatus();
    assert.strictEqual(status.mode, 'auto');
    assert.strictEqual(status.operating_hours.open, '09:00');
    assert.strictEqual(status.operating_hours.order_close, '21:30');
  });
});
