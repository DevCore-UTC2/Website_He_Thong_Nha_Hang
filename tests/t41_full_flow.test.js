const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
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

describe('T4.1 - Kiểm thử toàn bộ luồng chính (End-to-End)', () => {
  let adminToken = '';
  let staffToken = '';
  let customerToken = '';
  let testOrderId = null;
  let testOrderCode = null;
  let testItemId = null;

  after(() => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      if (typeof server.close === 'function') {
        server.close();
      }
    }
  });

  test('1. Luồng đăng nhập 3 role: Admin, Staff, Khách hàng', async () => {
    // Admin login
    const adminRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'admin@vinhaminh.vn', password: 'Admin@1234' }
    });
    assert.strictEqual(adminRes.status, 200, 'Admin đăng nhập thành công');
    assert.ok(adminRes.data.data.token, 'Admin nhận JWT token');
    assert.strictEqual(adminRes.data.data.user.role, 'admin', 'Role là admin');
    adminToken = adminRes.data.data.token;

    // Staff login
    const staffRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'staff@vinhaminh.vn', password: 'Staff@1234' }
    });
    assert.strictEqual(staffRes.status, 200, 'Staff đăng nhập thành công');
    assert.ok(staffRes.data.data.token, 'Staff nhận JWT token');
    assert.strictEqual(staffRes.data.data.user.role, 'staff', 'Role là staff');
    staffToken = staffRes.data.data.token;

    // Customer login
    const custRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'khach@gmail.com', password: 'Khach@1234' }
    });
    assert.strictEqual(custRes.status, 200, 'Khách hàng đăng nhập thành công');
    assert.ok(custRes.data.data.token, 'Khách hàng nhận JWT token');
    assert.strictEqual(custRes.data.data.user.role, 'customer', 'Role là customer');
    customerToken = custRes.data.data.token;
  });

  test('2. Luồng Khách hàng đặt món (Tạo đơn hàng mới)', async () => {
    const dish = await dbAsync.get('SELECT id, name, price FROM dishes WHERE is_available = 1 LIMIT 1');
    assert.ok(dish, 'Có ít nhất 1 món ăn trong CSDL');

    const orderPayload = {
      order_type: 'takeaway',
      customer_name: 'Nguyễn Văn Khách',
      customer_phone: '0901234567',
      items: [
        {
          dish_id: dish.id,
          quantity: 2,
          spice_level: 0,
          note: 'Khách mang về'
        }
      ],
      payment_method: 'cash'
    };

    const orderRes = await invoke('POST', '/api/orders', {
      headers: { authorization: `Bearer ${customerToken}` },
      body: orderPayload
    });

    assert.strictEqual(orderRes.status, 201, 'Tạo đơn hàng thành công');
    assert.ok(orderRes.data.data.order_id, 'Đơn hàng có order_id');
    assert.ok(orderRes.data.data.order_code, 'Đơn hàng có order_code');
    assert.strictEqual(orderRes.data.data.status, 'received', 'Trạng thái ban đầu là received');

    testOrderId = orderRes.data.data.order_id;
    testOrderCode = orderRes.data.data.order_code;
  });

  test('3. Luồng Quản lý Bếp: Nhân viên và Admin điều phối món theo các bước', async () => {
    // 3.1 Nhân viên truy cập bếp
    const staffKitchenRes = await invoke('GET', '/api/orders/kitchen', {
      headers: { authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(staffKitchenRes.status, 200, 'Nhân viên truy cập bếp thành công');
    const items = staffKitchenRes.data.data || [];
    const myItem = items.find(it => it.order_id === testOrderId);
    assert.ok(myItem, 'Nhân viên nhìn thấy món của đơn vừa đặt trong bếp');

    testItemId = myItem.id;

    // 3.2 Nhân viên chuyển món sang ĐANG NẤU (cooking)
    const cookingRes = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { status: 'cooking' }
    });
    assert.strictEqual(cookingRes.status, 200, 'Nhân viên chuyển món sang cooking thành công');

    // 3.3 Admin truy cập bếp và thấy món đang nấu
    const adminKitchenRes = await invoke('GET', '/api/orders/kitchen', {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminKitchenRes.status, 200, 'Admin truy cập bếp thành công');

    // 3.4 Admin chuyển món: cooking -> ready -> serving -> completed
    const readyRes = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { status: 'ready' }
    });
    assert.strictEqual(readyRes.status, 200, 'Admin chuyển món sang ready thành công');

    const servingRes = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { status: 'serving' }
    });
    assert.strictEqual(servingRes.status, 200, 'Admin chuyển món sang serving thành công');

    const completedRes = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { status: 'completed' }
    });
    assert.strictEqual(completedRes.status, 200, 'Admin phục vụ món hoàn tất (completed)');

    // 3.5 Khách hàng không được quyền đổi trạng thái món bếp
    const custHackRes = await invoke('PATCH', `/api/orders/items/${testItemId}/status`, {
      headers: { authorization: `Bearer ${customerToken}` },
      body: { status: 'cooking' }
    });
    assert.strictEqual(custHackRes.status, 403, 'Khách hàng bị từ chối 403 khi thao tác bếp');
  });

  test('4. Luồng Khách hàng tra cứu trạng thái đơn hàng (Order Tracking)', async () => {
    // Tra cứu qua GET /api/orders/track/:code (Khách hàng đã đăng nhập)
    const trackRes = await invoke('GET', `/api/orders/track/${testOrderCode}`, {
      headers: { authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(trackRes.status, 200, 'Tra cứu đơn hàng qua mã code thành công');
    assert.strictEqual(trackRes.data.data.status, 'completed', 'Đơn hàng tự động completed');

    // Khách vãng lai tra cứu đơn của thành viên cần số điện thoại
    const guestWithPhoneRes = await invoke('GET', `/api/orders/track/${testOrderCode}?phone=0901234567`);
    assert.strictEqual(guestWithPhoneRes.status, 200, 'Khách vãng lai xác thực SĐT tra cứu thành công');

    // Khách vãng lai không có SĐT bị từ chối 403
    const guestNoPhoneRes = await invoke('GET', `/api/orders/track/${testOrderCode}`);
    assert.strictEqual(guestNoPhoneRes.status, 403, 'Khách vãng lai thiếu SĐT bị từ chối 403');

    // Tra cứu qua GET /api/orders/my-orders
    const myOrdersRes = await invoke('GET', '/api/orders/my-orders', {
      headers: { authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(myOrdersRes.status, 200, 'Khách xem lịch sử đơn hàng thành công');
    const myOrders = myOrdersRes.data.data || [];
    const found = myOrders.find(o => o.id === testOrderId);
    assert.ok(found, 'Tìm thấy đơn hàng trong danh sách');
  });

  test('5. Kiểm tra Modal Quản trị (Admin Manager tabs): không bị cắt chữ, flex-wrap', () => {
    const adminManagerPath = path.join(__dirname, '../client/src/pages/admin/AdminManager.js');
    const content = fs.readFileSync(adminManagerPath, 'utf8');

    assert.ok(content.includes('flex-wrap'), 'Hàng tab quản trị dùng flex-wrap tự xuống dòng');
    assert.ok(content.includes('Món Ăn'), 'Có tab Món Ăn');
    assert.ok(content.includes('Danh Mục'), 'Có tab Danh Mục');
    assert.ok(content.includes('Doanh Thu'), 'Có tab Doanh Thu');
    assert.ok(content.includes('Kho'), 'Có tab Kho');
    assert.ok(content.includes('Nhân Viên'), 'Có tab Nhân Viên');
    assert.ok(content.includes('Duyệt Đánh Giá'), 'Có tab Duyệt Đánh Giá');
  });
});
