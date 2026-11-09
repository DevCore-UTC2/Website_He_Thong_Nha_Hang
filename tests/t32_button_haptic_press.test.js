const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T3.2 - Rung nhẹ khi bấm nút và hiệu ứng thị giác fallback scale(0.96)', () => {
  const jsFeedbackPath = path.join(__dirname, '../client/src/utils/ui-feedback.js');
  const mainJsPath = path.join(__dirname, '../client/src/main.js');
  const cssPath = path.join(__dirname, '../client/src/styles/utilities.css');

  test('Main.js khởi tạo initButtonFeedbackListener khi DOM sẵn sàng', () => {
    const mainContent = fs.readFileSync(mainJsPath, 'utf8');
    assert.ok(mainContent.includes('initButtonFeedbackListener'), 'main.js phải import và gọi initButtonFeedbackListener');
  });

  test('Rung nhẹ khi bấm nút sử dụng navigator.vibrate trong khoảng 10-15ms', () => {
    const jsContent = fs.readFileSync(jsFeedbackPath, 'utf8');
    assert.ok(jsContent.includes('triggerHaptic(12)'), 'Thời lượng rung phải nằm trong khoảng 10-15ms (12ms)');
    assert.ok(jsContent.includes('navigator.vibrate'), 'Phải bọc kiểm tra hỗ trợ navigator.vibrate');
    assert.ok(jsContent.includes('try {'), 'Bọc try catch an toàn khi kích hoạt vibrate');
  });

  test('Hiệu ứng thị giác fallback scale(0.96) qua class dùng chung và selector nút', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('scale(0.96)'), 'CSS phải có scale(0.96)');
    assert.ok(cssContent.includes('.ui-tap-active'), 'Có class .ui-tap-active cho visual fallback');
    assert.ok(cssContent.includes('.btn:active'), 'Có selector .btn:active');
    assert.ok(cssContent.includes('button:active'), 'Có selector button:active');
  });

  test('Event Delegation bắt tương tác trên mọi loại nút và tự động gỡ class', () => {
    const jsContent = fs.readFileSync(jsFeedbackPath, 'utf8');
    assert.ok(jsContent.includes('document.addEventListener(\'pointerdown\''), 'Lắng nghe pointerdown trên document');
    assert.ok(jsContent.includes('e.target.closest('), 'Sử dụng closest để tìm nút bấm');
    assert.ok(jsContent.includes('btn.classList.add(\'ui-tap-active\')'), 'Gắn class ui-tap-active');
    assert.ok(jsContent.includes('btn.classList.remove(\'ui-tap-active\')'), 'Gỡ class ui-tap-active khi nhả nút hoặc timeout');
  });
});
