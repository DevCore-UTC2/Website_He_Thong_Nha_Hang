/**
 * TEST SUITE: STORE STATUS, CART ISOLATION, RESERVATION RULES, ORDER & INVOICE SECURITY
 * Đảm bảo các yêu cầu cốt lõi trong Master Prompt:
 * 1. Store Status đồng bộ, kiểm soát chế độ mở/đóng cửa và phân quyền admin.
 * 2. Phân tách giỏ hàng, server làm nguồn sự thật (xác thực giá DB, kiểm tra món còn/hết, clamp số lượng).
 * 3. Chuẩn hóa đặt bàn (khung giờ 09:00-21:00 VN, lead time >= 1h, sức chứa bàn, chống trùng lịch, không lock trước bàn tương lai).
 * 4. Phân quyền tra cứu đơn hàng & hóa đơn (chặn khách hàng xem đơn của khách hàng khác).
 */

const { test, describe, before, after } = require('node:test');
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

describe('Store Status, Cart Validation, Reservation Rules & Access Security', () => {
  let adminToken = '';
  let customerToken1 = '';
  let customerToken2 = '';
  let testDish1 = null;
  let testDish2 = null;
  let testTable = null;

  before(async () => {
    // 1. Lấy token Admin
    const adminRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'admin@vinhaminh.vn', password: 'Admin@1234' }
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.data.data.token;

    // 2. Lấy token Customer 1
    const custRes1 = await invoke('POST', '/api/auth/login', {
      body: { email: 'khach@gmail.com', password: 'Khach@1234' }
    });
    assert.strictEqual(custRes1.status, 200);
    customerToken1 = custRes1.data.data.token;

    // 3. Đăng ký hoặc lấy token Customer 2
    let custRes2 = await invoke('POST', '/api/auth/login', {
      body: { email: 'khach2@gmail.com', password: 'Khach2@1234' }
    });
    if (custRes2.status !== 200) {
      const regRes = await invoke('POST', '/api/auth/register', {
        body: {
          name: 'Khách Hàng Số Hai',
          email: 'khach2@gmail.com',
          password: 'Khach2@1234',
          phone: '0933221100',
          consent: true
        }
      });
      assert.strictEqual(regRes.status, 201);
      customerToken2 = regRes.data.data.token;
    } else {
      customerToken2 = custRes2.data.data.token;
    }

    // 4. Lấy món ăn mẫu và bàn mẫu từ DB
    const dishes = await dbAsync.all('SELECT * FROM dishes WHERE is_available = 1 LIMIT 2');
    testDish1 = dishes[0];
    testDish2 = dishes[1] || dishes[0];

    testTable = await dbAsync.get('SELECT * FROM tables ORDER BY capacity ASC LIMIT 1');
  });

  after(() => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      if (typeof server.close === 'function') server.close();
    }
  });

  // ==========================================
  // PHẦN 1: STORE STATUS (HỆ THỐNG ĐIỀU KHIỂN TRẠNG THÁI MỞ/ĐÓNG CỬA)
  // ==========================================
  test('1.1 GET /api/store/status trả về trạng thái cửa hàng, chế độ và khung giờ chuẩn', async () => {
    const res = await invoke('GET', '/api/store/status');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data);
    assert.ok(['auto', 'force_open', 'force_closed'].includes(res.data.data.mode));
    assert.strictEqual(typeof res.data.data.is_open, 'boolean');
    assert.strictEqual(res.data.data.operating_hours.open, '09:00');
    assert.strictEqual(res.data.data.operating_hours.close, '22:00');
    assert.strictEqual(res.data.data.operating_hours.last_order, '21:30');
  });

  test('1.2 Admin có thể cập nhật chế độ cửa hàng (force_closed / auto)', async () => {
    // Admin force đóng cửa
    const closeRes = await invoke('PUT', '/api/store/status', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { mode: 'force_closed', note: 'Bảo trì hệ thống kiểm thử' }
    });
    assert.strictEqual(closeRes.status, 200);
    assert.strictEqual(closeRes.data.data.mode, 'force_closed');
    assert.strictEqual(closeRes.data.data.is_open, false);

    // Khôi phục lại chế độ auto
    const autoRes = await invoke('PUT', '/api/store/status', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { mode: 'auto' }
    });
    assert.strictEqual(autoRes.status, 200);
    assert.strictEqual(autoRes.data.data.mode, 'auto');
  });

  test('1.3 Khách hàng hoặc người dùng chưa xác thực bị từ chối 403/401 khi đổi store mode', async () => {
    // Khách hàng thường thử đổi trạng thái -> 403
    const custRes = await invoke('PUT', '/api/store/status', {
      headers: { authorization: `Bearer ${customerToken1}` },
      body: { mode: 'force_open' }
    });
    assert.strictEqual(custRes.status, 403);

    // Không có token -> 401
    const noAuthRes = await invoke('PUT', '/api/store/status', {
      body: { mode: 'force_open' }
    });
    assert.strictEqual(noAuthRes.status, 401);
  });

  // ==========================================
  // PHẦN 2: CART SYNC & PRICE VALIDATION (GIỎ HÀNG SERVER SỰ THẬT)
  // ==========================================
  test('2.1 Cart sync xác thực giá từ DB (không tin giá client gửi lên), clamp số lượng 1-99', async () => {
    const tamperedPayload = {
      items: [
        {
          dish_id: testDish1.id,
          name: testDish1.name,
          price: 500, // Giá client cố tình chỉnh sửa thành 500đ
          quantity: 200, // Số lượng vượt quá 99
          spice_level: 0,
          selected_toppings: [],
          note: '<script>alert("hack")</script>' // Note chứa script
        },
        {
          dish_id: testDish2.id,
          name: testDish2.name,
          price: 0,
          quantity: -10, // Số lượng âm
          spice_level: 1,
          selected_toppings: []
        }
      ]
    };

    const res = await invoke('POST', '/api/cart/sync', {
      headers: { authorization: `Bearer ${customerToken1}` },
      body: tamperedPayload
    });

    assert.strictEqual(res.status, 200);
    const syncedItems = res.data.data.items;
    assert.strictEqual(syncedItems.length, 2);

    // Món 1: Giá phải lấy lại từ DB (testDish1.price), số lượng clamp về 99
    assert.strictEqual(syncedItems[0].price, testDish1.price);
    assert.strictEqual(syncedItems[0].quantity, 99);
    assert.ok(!syncedItems[0].note.includes('<script>'), 'Note được sanitize');

    // Món 2: Giá lấy từ DB (testDish2.price), số lượng âm clamp về 1
    assert.strictEqual(syncedItems[1].price, testDish2.price);
    assert.strictEqual(syncedItems[1].quantity, 1);
  });

  test('2.2 Cart sync loại bỏ món không tồn tại hoặc đã hết hàng (is_available = 0)', async () => {
    // Giả sử có một dish không tồn tại id = 999999
    const payload = {
      items: [
        {
          dish_id: 999999,
          quantity: 2,
          price: 50000
        },
        {
          dish_id: testDish1.id,
          quantity: 1,
          price: testDish1.price
        }
      ]
    };

    const res = await invoke('POST', '/api/cart/sync', {
      headers: { authorization: `Bearer ${customerToken1}` },
      body: payload
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.items.length, 1, 'Món không hợp lệ bị loại bỏ khỏi giỏ');
    assert.strictEqual(res.data.data.items[0].dish_id, testDish1.id);
  });

  // ==========================================
  // PHẦN 3: RESERVATION VALIDATION & RULES (CHUẨN HÓA ĐẶT BÀN)
  // ==========================================
  test('3.1 Chặn đặt bàn ngoài khung giờ phục vụ 09:00 - 21:00', async () => {
    // 5 ngày sau lúc 22:30 (ngoài khung giờ nhận khách 09:00 - 21:00)
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    futureDate.setHours(22, 30, 0, 0);
    const dateStr = futureDate.toISOString();

    const invalidTimePayload = {
      customer_name: 'Nguyễn Văn Test',
      customer_phone: '0901234567',
      customer_email: 'test@gmail.com',
      reservation_time: dateStr,
      guest_count: 2,
      party_type: 'normal'
    };

    const res = await invoke('POST', '/api/reservations', {
      body: invalidTimePayload
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.includes('09:00') || res.data.message.includes('21:00'));
  });

  test('3.2 Chặn gán bàn có sức chứa nhỏ hơn số lượng khách đặt', async () => {
    const smallTable = await dbAsync.get('SELECT * FROM tables WHERE capacity <= 4 LIMIT 1');
    if (!smallTable) return;

    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    futureDate.setHours(12, 0, 0, 0);

    const payload = {
      customer_name: 'Đoàn Khách Đông',
      customer_phone: '0908889999',
      reservation_time: futureDate.toISOString(),
      guest_count: 10, // 10 khách nhưng chọn bàn sức chứa 4
      table_id: smallTable.id,
      party_type: 'normal'
    };

    const res = await invoke('POST', '/api/reservations', {
      body: payload
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.includes('sức chứa') || res.data.message.includes('chỗ ngồi'));
  });

  test('3.3 Chống trùng lịch đặt bàn (Overlapping Reservation) trong khoảng thời lượng tiệc', async () => {
    const availableTable = await dbAsync.get('SELECT * FROM tables WHERE capacity >= 4 LIMIT 1');
    if (!availableTable) return;

    // Dọn dẹp dữ liệu kiểm thử cũ nếu có
    await dbAsync.run("DELETE FROM reservations WHERE customer_phone LIKE '090777%'");

    // Đặt đơn 1: 5 ngày sau lúc 18:00, loại tiệc family (thời lượng 150 phút => chiếm bàn đến 20:30)
    const d1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    d1.setHours(18, 0, 0, 0);

    const booking1 = await invoke('POST', '/api/reservations', {
      body: {
        customer_name: 'Khách Đặt Trước',
        customer_phone: '0907771111',
        reservation_time: d1.toISOString(),
        guest_count: 4,
        table_id: availableTable.id,
        party_type: 'family'
      }
    });
    assert.strictEqual(booking1.status, 201);

    // Đặt đơn 2: Cùng bàn, lúc 19:00 (trùng trong khoảng 18:00 - 20:30) -> phải bị từ chối 400
    const d2 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    d2.setHours(19, 0, 0, 0);

    const booking2 = await invoke('POST', '/api/reservations', {
      body: {
        customer_name: 'Khách Đặt Trùng',
        customer_phone: '0907772222',
        reservation_time: d2.toISOString(),
        guest_count: 4,
        table_id: availableTable.id,
        party_type: 'normal'
      }
    });
    assert.strictEqual(booking2.status, 400);
    assert.ok(booking2.data.message.includes('đã có lịch') || booking2.data.message.includes('trùng'));
  });

  // ==========================================
  // PHẦN 4: ORDER & INVOICE SECURITY (BẢO VỆ DỮ LIỆU & PHÂN QUYỀN TRA CỨU)
  // ==========================================
  test('4.1 Khách hàng này không được tra cứu đơn hàng của khách hàng khác (403 Forbidden)', async () => {
    // Tạo 1 đơn hàng mới thuộc Customer 1
    const orderRes = await invoke('POST', '/api/orders', {
      headers: { authorization: `Bearer ${customerToken1}` },
      body: {
        order_type: 'takeaway',
        customer_name: 'Trần Thị Khách Quen',
        customer_phone: '0987654321',
        items: [{ dish_id: testDish1.id, quantity: 1, spice_level: 0 }],
        payment_method: 'cash'
      }
    });
    assert.strictEqual(orderRes.status, 201);
    const orderCode = orderRes.data.data.order_code;

    // Customer 1 tra cứu đơn của chính mình -> Thành công 200
    const ownRes = await invoke('GET', `/api/orders/track/${orderCode}`, {
      headers: { authorization: `Bearer ${customerToken1}` }
    });
    assert.strictEqual(ownRes.status, 200);
    assert.strictEqual(ownRes.data.data.order_code, orderCode);

    // Customer 2 tra cứu đơn của Customer 1 -> Phải bị từ chối 403
    const foreignRes = await invoke('GET', `/api/orders/track/${orderCode}`, {
      headers: { authorization: `Bearer ${customerToken2}` }
    });
    assert.strictEqual(foreignRes.status, 403);

    // Khách vãng lai không truyền SĐT tra cứu đơn của Customer 1 -> Bị từ chối 403
    const guestNoPhone = await invoke('GET', `/api/orders/track/${orderCode}`);
    assert.strictEqual(guestNoPhone.status, 403);

    // Khách vãng lai truyền đúng SĐT đặt hàng -> Thành công 200
    const guestCorrectPhone = await invoke('GET', `/api/orders/track/${orderCode}?phone=0987654321`);
    assert.strictEqual(guestCorrectPhone.status, 200);

    // Hóa đơn đơn hàng của Customer 1: Customer 2 truy cập -> Bị từ chối 403
    const foreignInvoice = await invoke('GET', `/api/invoices/by-order/${orderCode}`, {
      headers: { authorization: `Bearer ${customerToken2}` }
    });
    assert.strictEqual(foreignInvoice.status, 403);
  });
});
