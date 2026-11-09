const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { app, server } = require('../server/app');
const { dbAsync } = require('../server/config/db');

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

describe('T2.3 - Backend API cho bếp', () => {
  let staffToken = '';
  let adminToken = '';
  let custToken = '';
  let testItemId = null;
  let testOrderId = null;

  test('Đăng nhập lấy JWT tokens cho Admin, Staff, Khách hàng', async () => {
    const staffRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'staff@vinhaminh.vn', password: 'Staff@1234' }
    });
    assert.strictEqual(staffRes.status, 200);
    staffToken = staffRes.data.data.token;

    const adminRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'admin@vinhaminh.vn', password: 'Admin@1234' }
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.data.data.token;

    const custRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'khach@gmail.com', password: 'Khach@1234' }
    });
    if (custRes.status === 200) {
      custToken = custRes.data.data.token;
    }
  });

  test('Tạo một đơn hàng mẫu để kiểm thử món bếp', async () => {
    const dish = await dbAsync.get('SELECT * FROM dishes WHERE is_available = 1 LIMIT 1');
    assert.ok(dish, 'Phải có ít nhất 1 món ăn trong database');

    const orderRes = await invoke('POST', '/api/orders', {
      body: {
        order_type: 'takeaway',
        customer_name: 'Khách Bếp Test',
        customer_phone: '0912345678',
        items: [
          {
            dish_id: dish.id,
            quantity: 2,
            spice_level: 1,
            note: 'Không hành tây'
          }
        ],
        payment_method: 'cash'
      }
    });
    if (orderRes.status !== 201) {
      console.error('Order creation failed:', orderRes.data);
    }
    assert.strictEqual(orderRes.status, 201, 'Tạo đơn thành công');
    assert.strictEqual(orderRes.data.success, true);
    testOrderId = orderRes.data.data.order_id || orderRes.data.data.id;

    const items = await dbAsync.all('SELECT * FROM order_items WHERE order_id = ?', [testOrderId]);
    assert.ok(items.length > 0);
    testItemId = items[0].id;
    assert.strictEqual(items[0].item_status, 'received');
  });

  test('GET /api/orders/kitchen trả về danh sách món với đầy đủ trường thông tin', async () => {
    const res = await invoke('GET', '/api/orders/kitchen', {
      headers: { authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data), 'Kết quả phải là một mảng danh sách món');

    const item = res.data.data.find(it => it.id === testItemId);
    assert.ok(item, 'Phải tìm thấy món trong danh sách bếp');
    assert.ok(item.order_code, 'Món phải có order_code');
    assert.ok(item.dish_name, 'Món phải có tên món');
    assert.strictEqual(item.quantity, 2, 'Số lượng khớp');
    assert.strictEqual(item.note, 'Không hành tây', 'Ghi chú khớp');
    assert.ok(item.created_at, 'Thời gian đặt khớp');
    assert.strictEqual(item.item_status, 'received', 'Trạng thái ban đầu là received (Chưa nấu)');
  });

  test('Kiểm tra chặn nhảy cóc: Chưa nấu -> Đã nấu xong (nhảy qua Đang nấu) phải bị từ chối 400', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'ready' }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('nhảy cóc'), 'Thông báo phải ghi rõ không được nhảy cóc');
  });

  test('Đổi trạng thái hợp lệ: Chưa nấu (received) -> Đang nấu (cooking)', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'cooking' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.item_status, 'cooking');
  });

  test('Kiểm tra chặn lùi trạng thái: Đang nấu (cooking) -> Chưa nấu (received) phải bị từ chối 400', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'received' }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('lùi trạng thái'), 'Thông báo phải ghi rõ không được lùi trạng thái');
  });

  test('Đổi trạng thái hợp lệ: Đang nấu (cooking) -> Đã nấu xong (ready)', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'ready' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.item_status, 'ready');
  });

  test('Đổi trạng thái hợp lệ: Đã nấu xong (ready) -> Phục vụ ra bàn (serving)', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'serving' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.item_status, 'serving');
  });

  test('Đổi trạng thái hợp lệ: Phục vụ ra bàn (serving) -> Hoàn tất (completed)', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'completed' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.item_status, 'completed');
  });

  test('Món đã completed không thể đổi lại trạng thái', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'cooking' }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });

  test('Khách hàng bị từ chối 403 khi cố đổi trạng thái món bếp', async () => {
    if (custToken) {
      const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
        headers: { authorization: `Bearer ${custToken}` },
        body: { status: 'ready' }
      });
      assert.strictEqual(res.status, 403);
    }
  });

  test('Yêu cầu không có JWT token bị từ chối 401', async () => {
    const res = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      body: { status: 'ready' }
    });
    assert.strictEqual(res.status, 401);
  });

  after(() => {
    if (server && server.close) {
      server.close();
    }
  });
});
