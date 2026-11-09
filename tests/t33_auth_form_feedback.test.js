const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T3.3 - Form đăng nhập: shake khi lỗi, modal nảy nhẹ khi click ngoài, viền đỏ rung khi input lỗi', () => {
  const authModalPath = path.join(__dirname, '../client/src/components/AuthModal.js');
  const cssPath = path.join(__dirname, '../client/src/styles/utilities.css');

  test('Form đăng nhập rung lắc (triggerShake) khi xảy ra lỗi xác thực hoặc thiếu dữ liệu', () => {
    const content = fs.readFileSync(authModalPath, 'utf8');
    assert.ok(content.includes('triggerShake(loginForm)'), 'Phải gọi triggerShake khi form đăng nhập lỗi');
    assert.ok(content.includes('import { triggerShake'), 'Phải import triggerShake từ ui-feedback.js');
  });

  test('Modal nảy nhẹ (triggerBounce) khi click ngoài backdrop', () => {
    const content = fs.readFileSync(authModalPath, 'utf8');
    assert.ok(content.includes('triggerBounce(box)'), 'Phải gọi triggerBounce(box) khi click vào backdrop');
    assert.ok(content.includes('e.target === authModalEl'), 'Kiểm tra target là backdrop');
  });

  test('Input lỗi có viền đỏ và hiệu ứng rung (triggerInputError)', () => {
    const content = fs.readFileSync(authModalPath, 'utf8');
    assert.ok(content.includes('triggerInputError(inputEl)'), 'showFieldError gọi triggerInputError để tạo rung và viền đỏ');
    assert.ok(content.includes('inputEl.classList.remove(\'ui-input-error\')'), 'hideFieldError dọn dẹp class lỗi');
  });

  test('CSS định nghĩa rõ ràng viền đỏ và bóng đổ cảnh báo cho input lỗi', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.ui-input-error'), 'Có class .ui-input-error');
    assert.ok(cssContent.includes('.input-error'), 'Có class .input-error');
    assert.ok(cssContent.includes('border-color: var(--color-danger'), 'Viền màu đỏ cảnh báo');
  });
});
