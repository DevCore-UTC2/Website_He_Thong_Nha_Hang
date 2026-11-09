/**
 * TEST SUITE: TASK 4 - QUẢN LÝ NHÂN VIÊN VÀ KHÓA TÀI KHOẢN KHÁCH
 * 1. Phân quyền Admin: Tạo nhân viên mới (validate name, email, password >= 6 ký tự, email trùng, role staff).
 * 2. Phân quyền Staff: Gọi thẳng POST /api/staff-manager/staff hoặc PATCH /api/staff-manager/lock/:id bị chặn 403.
 * 3. Khóa tài khoản khách: Admin khóa tài khoản khách, khách không đăng nhập được (403), mở khóa thì đăng nhập bình thường.
 * 4. Chặn Admin tự khóa chính mình (400).
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { app } = require('../server/app');
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

describe('TASK 4: Quản lý nhân viên & Khóa tài khoản (Chỉ Admin)', () => {
  let adminToken = '';
  let adminId = null;
  let staffToken = '';
  let customerUser = null;
  const testStaffEmail = `test.staff.${Date.now()}@vinhaminh.vn`;

  before(async () => {
    // 1. Đăng nhập Admin
    const adminRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'admin@vinhaminh.vn', password: 'Admin@1234' }
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.data.data.token;
    adminId = adminRes.data.data.user.id;

    // 2. Đăng nhập Staff
    const staffRes = await invoke('POST', '/api/auth/login', {
      body: { email: 'staff@vinhaminh.vn', password: 'Staff@1234' }
    });
    assert.strictEqual(staffRes.status, 200);
    staffToken = staffRes.data.data.token;

    // 3. Lấy thông tin khách hàng mẫu
    customerUser = await dbAsync.get("SELECT * FROM users WHERE email = 'khach@gmail.com'");
  });

  after(async () => {
    // Xóa nhân viên kiểm thử và khôi phục trạng thái khách hàng
    await dbAsync.run('DELETE FROM users WHERE email = ?', [testStaffEmail]);
    if (customerUser) {
      await dbAsync.run('UPDATE users SET is_locked = 0 WHERE id = ?', [customerUser.id]);
    }
  });

  test('4.1 Admin tạo tài khoản nhân viên mới thành công và được xác thực đầy đủ', async () => {
    // Thử thiếu trường
    const resMissing = await invoke('POST', '/api/staff-manager/staff', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { name: 'Nhân viên test' }
    });
    assert.strictEqual(resMissing.status, 400);

    // Thử email sai định dạng
    const resBadEmail = await invoke('POST', '/api/staff-manager/staff', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { name: 'Nhân viên test', email: 'khongphaiemail', password: 'Staff@1234' }
    });
    assert.strictEqual(resBadEmail.status, 400);

    // Thử mật khẩu < 6 ký tự
    const resShortPw = await invoke('POST', '/api/staff-manager/staff', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { name: 'Nhân viên test', email: testStaffEmail, password: '123' }
    });
    assert.strictEqual(resShortPw.status, 400);

    // Tạo hợp lệ
    const resValid = await invoke('POST', '/api/staff-manager/staff', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { name: 'Nhân Viên Mới Tuyển', email: testStaffEmail, password: 'StaffPassword123' }
    });
    assert.strictEqual(resValid.status, 201);
    assert.strictEqual(resValid.data.success, true);

    // Kiểm tra trong DB: role phải là staff, is_locked là 0
    const created = await dbAsync.get('SELECT * FROM users WHERE email = ?', [testStaffEmail]);
    assert.ok(created);
    assert.strictEqual(created.role, 'staff');
    assert.strictEqual(created.is_locked, 0);

    // Thử tạo lại cùng email -> Bị từ chối vì email đã tồn tại
    const resDup = await invoke('POST', '/api/staff-manager/staff', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { name: 'Nhân viên trùng', email: testStaffEmail, password: 'StaffPassword123' }
    });
    assert.strictEqual(resDup.status, 400);
  });

  test('4.2 Nhân viên (Staff) không có quyền gọi API tạo nhân viên hay khóa tài khoản (403)', async () => {
    // Staff gọi tạo nhân viên -> 403
    const resCreate = await invoke('POST', '/api/staff-manager/staff', {
      headers: { authorization: `Bearer ${staffToken}` },
      body: { name: 'Nhân Viên Hắc Ám', email: 'hack@vinhaminh.vn', password: 'Password123' }
    });
    assert.strictEqual(resCreate.status, 403);

    // Staff gọi khóa người dùng -> 403
    const resLock = await invoke('PATCH', `/api/staff-manager/lock/${customerUser.id}`, {
      headers: { authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(resLock.status, 403);
  });

  test('4.3 Khóa tài khoản khách: Admin khóa -> khách không thể đăng nhập -> mở khóa -> khách đăng nhập bình thường', async () => {
    // Admin khóa tài khoản khách
    const lockRes = await invoke('PATCH', `/api/staff-manager/lock/${customerUser.id}`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(lockRes.status, 200);

    // Kiểm tra trong DB: is_locked = 1
    const lockedUser = await dbAsync.get('SELECT is_locked FROM users WHERE id = ?', [customerUser.id]);
    assert.strictEqual(lockedUser.is_locked, 1);

    // Khách đăng nhập vào -> Bị từ chối 403 với thông báo "Tài khoản đã bị khóa"
    const loginFail = await invoke('POST', '/api/auth/login', {
      body: { email: customerUser.email, password: 'Khach@1234' }
    });
    assert.strictEqual(loginFail.status, 403);
    assert.strictEqual(loginFail.data.success, false);
    assert.ok(loginFail.data.message.includes('khóa') || loginFail.data.message.includes('bị khóa'));

    // Admin mở khóa lại tài khoản
    const unlockRes = await invoke('PATCH', `/api/staff-manager/lock/${customerUser.id}`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(unlockRes.status, 200);

    // Khách đăng nhập lại -> Thành công 200
    const loginSuccess = await invoke('POST', '/api/auth/login', {
      body: { email: customerUser.email, password: 'Khach@1234' }
    });
    assert.strictEqual(loginSuccess.status, 200);
    assert.strictEqual(loginSuccess.data.success, true);
    assert.ok(loginSuccess.data.data.token);
  });

  test('4.4 Admin không thể tự khóa chính mình (400)', async () => {
    const selfLockRes = await invoke('PATCH', `/api/staff-manager/lock/${adminId}`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(selfLockRes.status, 400);
    assert.strictEqual(selfLockRes.data.success, false);
    assert.ok(selfLockRes.data.message.includes('không thể tự khóa'));
  });
});
