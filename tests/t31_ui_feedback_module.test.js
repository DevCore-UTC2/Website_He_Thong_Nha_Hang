const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('T3.1 - Module dùng chung UI Feedback và CSS classes', () => {
  const jsPath = path.join(__dirname, '../client/src/utils/ui-feedback.js');
  const cssPath = path.join(__dirname, '../client/src/styles/utilities.css');

  test('Module ui-feedback.js tồn tại và cung cấp đầy đủ các hàm feedback', () => {
    assert.ok(fs.existsSync(jsPath), 'File ui-feedback.js phải tồn tại');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    assert.ok(jsContent.includes('export function triggerHaptic'), 'Có hàm triggerHaptic');
    assert.ok(jsContent.includes('export function triggerPressFeedback'), 'Có hàm triggerPressFeedback');
    assert.ok(jsContent.includes('export function triggerShake'), 'Có hàm triggerShake');
    assert.ok(jsContent.includes('export function triggerBounce'), 'Có hàm triggerBounce');
    assert.ok(jsContent.includes('export function triggerInputError'), 'Có hàm triggerInputError');
    assert.ok(jsContent.includes('export function initButtonFeedbackListener'), 'Có hàm initButtonFeedbackListener');
    assert.ok(jsContent.includes('navigator.vibrate'), 'Có kiểm tra navigator.vibrate an toàn');
    assert.ok(jsContent.includes('prefers-reduced-motion'), 'Tôn trọng tùy chọn giảm chuyển động');
  });

  test('CSS utilities.css chứa các class và keyframe cho micro-interactions', () => {
    assert.ok(fs.existsSync(cssPath), 'utilities.css phải tồn tại');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('.ui-tap-active'), 'Có class .ui-tap-active');
    assert.ok(cssContent.includes('.ui-shake'), 'Có class .ui-shake');
    assert.ok(cssContent.includes('.ui-bounce'), 'Có class .ui-bounce');
    assert.ok(cssContent.includes('.ui-input-error'), 'Có class .ui-input-error');
    assert.ok(cssContent.includes('@keyframes uiShakeAnim'), 'Có keyframe uiShakeAnim');
    assert.ok(cssContent.includes('@keyframes uiBounceAnim'), 'Có keyframe uiBounceAnim');
  });

  test('Tuân thủ nghiêm ngặt quy tắc CSS của dự án', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const cleanContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');

    // Không được dùng transition: all
    assert.ok(!cleanContent.match(/transition\s*:\s*all\b/), 'Tuyệt đối không dùng transition: all');

    // Không được dùng scale(0)
    assert.ok(!cssContent.includes('scale(0)'), 'Tuyệt đối không dùng animation scale(0)');

    // Phải hỗ trợ prefers-reduced-motion
    assert.ok(cssContent.includes('prefers-reduced-motion: reduce'), 'Có media query prefers-reduced-motion');
  });
});
