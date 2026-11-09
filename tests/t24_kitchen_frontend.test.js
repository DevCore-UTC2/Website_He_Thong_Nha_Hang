const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T2.4 - Frontend menu bếp (Kitchen Display)', () => {
  const filePath = path.join(__dirname, '../client/src/pages/staff/KitchenDisplay.js');
  const content = fs.readFileSync(filePath, 'utf8');

  test('Hiển thị đầy đủ 4 cột / nhóm trạng thái món', () => {
    assert.ok(content.includes('CHƯA NẤU'), 'Phải có cột CHƯA NẤU');
    assert.ok(content.includes('ĐANG NẤU'), 'Phải có cột ĐANG NẤU');
    assert.ok(content.includes('ĐÃ NẤU XONG'), 'Phải có cột ĐÃ NẤU XONG');
    assert.ok(content.includes('CHỜ PHỤC VỤ'), 'Phải có cột CHỜ PHỤC VỤ');
  });

  test('Có thông báo trạng thái rỗng thân thiện cho các cột', () => {
    assert.ok(content.includes('Chưa có món nào cần nấu'), 'Phải có thông báo "Chưa có món nào cần nấu"');
    assert.ok(content.includes('Bếp đang trống'), 'Phải có thông báo "Bếp đang trống"');
    assert.ok(content.includes('Chưa có món xong'), 'Phải có thông báo "Chưa có món xong"');
    assert.ok(content.includes('Không có món chờ bưng'), 'Phải có thông báo "Không có món chờ bưng"');
  });

  test('Mỗi thẻ món có nút chuyển sang bước kế tiếp theo luồng', () => {
    assert.ok(content.includes('Bắt đầu nấu'), 'Có nút Bắt đầu nấu');
    assert.ok(content.includes('Nấu xong'), 'Có nút Nấu xong');
    assert.ok(content.includes('Chuyển phục vụ'), 'Có nút Chuyển phục vụ');
    assert.ok(content.includes('Phục vụ ra bàn'), 'Có nút Phục vụ ra bàn');
  });

  test('Sắp xếp món cũ nhất lên trước', () => {
    assert.ok(content.includes('sortedItems'), 'Có logic sắp xếp món');
    assert.ok(content.includes('created_at'), 'Sắp xếp theo thời gian created_at');
  });

  test('Lắng nghe sự kiện socket realtime', () => {
    assert.ok(content.includes('order:new'), 'Lắng nghe order:new');
    assert.ok(content.includes('order:status'), 'Lắng nghe order:status');
    assert.ok(content.includes('order:item_status'), 'Lắng nghe order:item_status');
  });
});
