const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T2.7 - Bếp tự làm mới danh sách không nhấp nháy UI', () => {
  const filePath = path.join(__dirname, '../client/src/pages/staff/KitchenDisplay.js');
  const content = fs.readFileSync(filePath, 'utf8');

  test('Phân tách khung Modal Shell và 4 container cột riêng biệt', () => {
    assert.ok(content.includes('ensureKitchenModalShell'), 'Có hàm ensureKitchenModalShell tạo khung cố định');
    assert.ok(content.includes('container-col-unstarted'), 'Có container riêng cho cột Chưa nấu');
    assert.ok(content.includes('container-col-cooking'), 'Có container riêng cho cột Đang nấu');
    assert.ok(content.includes('container-col-ready'), 'Có container riêng cho cột Đã nấu xong');
    assert.ok(content.includes('container-col-serving'), 'Có container riêng cho cột Chờ phục vụ');
  });

  test('Cơ chế chống nhấp nháy UI (Dirty Check innerHTML & textContent)', () => {
    assert.ok(content.includes('updateColumnContainer'), 'Có hàm cập nhật container có điều kiện');
    assert.ok(content.includes('container.innerHTML !== newHtml'), 'Chỉ cập nhật innerHTML khi nội dung có thay đổi thực sự');
    assert.ok(content.includes('el.textContent !== text'), 'Chỉ cập nhật số lượng món khi text thay đổi');
  });

  test('Tự động làm mới bằng polling định kỳ và dọn dẹp khi đóng', () => {
    assert.ok(content.includes('pollInterval = setInterval'), 'Có setInterval chạy tự động làm mới');
    assert.ok(content.includes('clearInterval(pollInterval)'), 'Dọn dẹp timer khi đóng modal bếp');
  });

  test('Lắng nghe Socket.IO realtime và tự động nạp dữ liệu ở chế độ nền', () => {
    assert.ok(content.includes('order:new'), 'Lắng nghe socket order:new');
    assert.ok(content.includes('order:status'), 'Lắng nghe socket order:status');
    assert.ok(content.includes('order:item_status'), 'Lắng nghe socket order:item_status');
    assert.ok(content.includes('loadKitchenData(true)'), 'Chế độ silent=true khi làm mới tự động để không hiện toast thừa');
  });

  test('Sử dụng Event Delegation để sự kiện nút bấm bền vững khi cập nhật thẻ', () => {
    assert.ok(content.includes('attachStaticKitchenEvents'), 'Có hàm gắn event tĩnh cho modal shell');
    assert.ok(content.includes('kitchen-kanban-grid'), 'Ủy quyền sự kiện qua container grid');
    assert.ok(content.includes('e.target.closest(\'.btn-change-status\')'), 'Bắt sự kiện đổi trạng thái qua closest');
  });
});
