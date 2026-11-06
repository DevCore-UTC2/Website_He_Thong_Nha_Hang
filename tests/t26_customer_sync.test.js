const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T2.6 - Đồng bộ với khách (Order Tracking Modal)', () => {
  const filePath = path.join(__dirname, '../client/src/pages/customer/OrderTrackingModal.js');
  const content = fs.readFileSync(filePath, 'utf8');

  test('Lắng nghe Socket.IO realtime cho order:status và order:item_status', () => {
    assert.ok(content.includes('order:status'), 'Lắng nghe sự kiện order:status');
    assert.ok(content.includes('order:item_status'), 'Lắng nghe sự kiện order:item_status');
    assert.ok(content.includes('setupTrackingSocket'), 'Có hàm setupTrackingSocket');
  });

  test('Hiển thị trạng thái tiến độ chi tiết của từng món ăn', () => {
    assert.ok(content.includes('Chờ nấu'), 'Có trạng thái Chờ nấu');
    assert.ok(content.includes('Đang nấu'), 'Có trạng thái Đang nấu');
    assert.ok(content.includes('Đã xong'), 'Có trạng thái Đã xong');
    assert.ok(content.includes('Đang bưng món'), 'Có trạng thái Đang bưng món');
    assert.ok(content.includes('Đã phục vụ'), 'Có trạng thái Đã phục vụ');
  });

  test('Thanh tiến trình 5 bước đến khi hoàn tất', () => {
    assert.ok(content.includes('STATUS_STEPS'), 'Có định nghĩa STATUS_STEPS');
    assert.ok(content.includes('received'), 'Bước received');
    assert.ok(content.includes('cooking'), 'Bước cooking');
    assert.ok(content.includes('ready'), 'Bước ready');
    assert.ok(content.includes('serving'), 'Bước serving');
    assert.ok(content.includes('completed'), 'Bước completed');
  });

  test('Hiển thị thông điệp hoàn tất khi toàn bộ món được phục vụ', () => {
    assert.ok(content.includes('Toàn bộ món ăn đã được phục vụ'), 'Có thông điệp hoàn tất phục vụ');
  });
});
