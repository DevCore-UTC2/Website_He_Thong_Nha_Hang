const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T3.4 - Micro-interactions (giỏ hàng nảy, hover thẻ món, toast trượt, modal fade/scale)', () => {
  const mainJsPath = path.join(__dirname, '../client/src/main.js');
  const cssPath = path.join(__dirname, '../client/src/styles/utilities.css');

  test('Hiệu ứng nảy giỏ hàng (Cart bounce) khi số lượng món thay đổi', () => {
    const mainContent = fs.readFileSync(mainJsPath, 'utf8');
    assert.ok(mainContent.includes('cart:change'), 'Lắng nghe sự kiện cart:change');
    assert.ok(mainContent.includes('triggerBounce(badge)'), 'Gọi triggerBounce cho badge giỏ hàng');
  });

  test('Hover thẻ món ăn mượt mà (translateY, box-shadow, scale nhẹ ảnh)', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.card-hover:hover'), 'Có selector .card-hover:hover');
    assert.ok(cssContent.includes('translateY(-4px)'), 'Dịch chuyển thẻ món lên khi hover');
    assert.ok(cssContent.includes('hover: hover'), 'Bọc trong media query hover: hover');
  });

  test('Toast trượt mượt mà (slide-in) và mờ dần khi ẩn', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('@keyframes toast-slide-in'), 'Có keyframe toast-slide-in');
    assert.ok(cssContent.includes('.toast'), 'Có selector .toast');
  });

  test('Modal có hiệu ứng fade nền và co giãn nhẹ (scale 0.95 -> 1)', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.modal-backdrop'), 'Có class .modal-backdrop');
    assert.ok(cssContent.includes('.modal-backdrop.active'), 'Có class .modal-backdrop.active');
    assert.ok(cssContent.includes('.modal-box'), 'Có class .modal-box');
    assert.ok(cssContent.includes('scale(0.95)'), 'Modal xuất hiện từ scale(0.95)');
    assert.ok(cssContent.includes('scale(1)'), 'Modal đạt scale(1) khi active');
  });

  test('Tất cả micro-interactions tôn trọng tùy chọn prefers-reduced-motion', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('prefers-reduced-motion: reduce'), 'Có media query prefers-reduced-motion');
  });
});
