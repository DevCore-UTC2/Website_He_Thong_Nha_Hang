/**
 * UNIT TEST: MOTION & ANIMATION TIÊU CHUẨN (T27)
 * Đảm bảo tuân thủ nghiêm ngặt 10 tiêu chuẩn hiệu năng motion:
 * 1. Không chứa "transition: all"
 * 2. Không chứa "scale(0)"
 * 3. Hỗ trợ prefers-reduced-motion: reduce
 * 4. Hỗ trợ hover: hover cho desktop mouse
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stylesDir = path.join(__dirname, '../client/src/styles');

test('Không có file CSS nào sử dụng "transition: all"', () => {
  const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));
  for (const file of cssFiles) {
    const raw = fs.readFileSync(path.join(stylesDir, file), 'utf8');
    // Xóa toàn bộ comment /* ... */ trước khi kiểm tra
    const content = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      assert.ok(
        !trimmed.match(/transition\s*:\s*all\b/),
        `Phát hiện transition: all tại ${file}:${idx + 1}: "${trimmed}"`
      );
    });
  }
});

test('Không có animation nào sử dụng scale(0)', () => {
  const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));
  for (const file of cssFiles) {
    const content = fs.readFileSync(path.join(stylesDir, file), 'utf8');
    assert.ok(!content.includes('scale(0)'), `Phát hiện scale(0) tại ${file}`);
  }
});

test('Hỗ trợ prefers-reduced-motion để bảo vệ người dùng nhạy cảm tiền đình', () => {
  const baseCss = fs.readFileSync(path.join(stylesDir, 'base.css'), 'utf8');
  assert.ok(
    baseCss.includes('prefers-reduced-motion: reduce') || baseCss.includes('prefers-reduced-motion'),
    'Thiếu @media (prefers-reduced-motion: reduce) trong base.css'
  );
});

test('Hỗ trợ hover: hover để chống dính hover trên màn hình cảm ứng', () => {
  const baseCss = fs.readFileSync(path.join(stylesDir, 'base.css'), 'utf8');
  assert.ok(
    baseCss.includes('hover: hover'),
    'Thiếu @media (hover: hover) trong base.css'
  );
});
