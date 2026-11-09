const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T2.5 - Nút "Phục vụ ra bàn" và hiệu ứng mờ dần 5 giây', () => {
  const kitchenPath = path.join(__dirname, '../client/src/pages/staff/KitchenDisplay.js');
  const kitchenJs = fs.readFileSync(kitchenPath, 'utf8');

  const cssPath = path.join(__dirname, '../client/src/styles/utilities.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  test('CSS chứa @keyframes kitchenItemFadeOut và lớp .kitchen-item-fading 5 giây', () => {
    assert.ok(cssContent.includes('@keyframes kitchenItemFadeOut'), 'Có keyframes kitchenItemFadeOut');
    assert.ok(cssContent.includes('.kitchen-item-fading'), 'Có class .kitchen-item-fading');
    assert.ok(cssContent.includes('5s'), 'Thời lượng animation là 5 giây');
    assert.ok(!cssContent.includes('scale(0)'), 'Không dùng scale(0)');
  });

  test('KitchenDisplay gắn lớp mờ dần khi bấm Phục vụ ra bàn (status === completed)', () => {
    assert.ok(kitchenJs.includes('kitchen-item-fading'), 'Gắn class kitchen-item-fading vào thẻ món');
    assert.ok(kitchenJs.includes('5000'), 'Dùng bộ đếm thời gian 5000ms (5 giây)');
  });

  test('Có nút "Phục vụ ra bàn" cho món ở bước serving', () => {
    assert.ok(kitchenJs.includes('Phục vụ ra bàn'), 'Có nhãn nút "Phục vụ ra bàn"');
    assert.ok(kitchenJs.includes('completed'), 'Trạng thái chuyển tiếp là completed');
  });

  test('Quản lý danh sách fadingItems tránh giật / mất thẻ đột ngột', () => {
    assert.ok(kitchenJs.includes('fadingItems'), 'Có cấu trúc dữ liệu theo dõi fadingItems');
  });
});
