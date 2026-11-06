/**
 * UNIT TEST: BROWSERSLIST & CSS FALLBACKS (T33)
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

test('Cấu hình browserslist tồn tại và bao quát các trình duyệt phổ biến', () => {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.ok(Array.isArray(pkg.browserslist), 'package.json phải có mảng browserslist');
  assert.ok(pkg.browserslist.length >= 4, 'browserslist phải khai báo nhiều môi trường');

  const str = pkg.browserslist.join(' ');
  assert.ok(str.includes('Safari'), 'browserslist phải có Safari');
  assert.ok(str.includes('Chrome'), 'browserslist phải có Chrome');
});

test('Tài liệu docs/BROWSER_MATRIX.md tồn tại và ghi nhận trung thực mức độ kiểm thử', () => {
  const matrixPath = path.join(ROOT_DIR, 'docs', 'BROWSER_MATRIX.md');
  assert.ok(fs.existsSync(matrixPath), 'docs/BROWSER_MATRIX.md phải tồn tại');

  const content = fs.readFileSync(matrixPath, 'utf8');
  assert.ok(content.includes('Chrome'), 'Phải đề cập đến Chrome');
  assert.ok(content.includes('Safari'), 'Phải đề cập đến Safari');
  assert.ok(content.includes('Firefox'), 'Phải đề cập đến Firefox');
  assert.ok(content.includes('Edge'), 'Phải đề cập đến Edge');

  // Kiểm tra ghi nhận trung thực không khẳng định đã thử trên mọi thiết bị vật lý
  assert.ok(
    content.toLowerCase().includes('chưa tiến hành kiểm thử vật lý') ||
    content.toLowerCase().includes('chưa') ||
    content.toLowerCase().includes('disclaimer'),
    'Phải có ghi nhận trung thực về việc chưa kiểm thử trên toàn bộ thiết bị vật lý'
  );
});

test('CSS Fallback: Các khai báo backdrop-filter đều có -webkit-backdrop-filter', () => {
  const stylesDir = path.join(ROOT_DIR, 'client', 'src', 'styles');
  const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));

  for (const file of cssFiles) {
    const content = fs.readFileSync(path.join(stylesDir, file), 'utf8');
    if (content.includes('backdrop-filter:') && !content.includes('-webkit-backdrop-filter:')) {
      assert.fail(`File ${file} có backdrop-filter nhưng thiếu -webkit-backdrop-filter`);
    }
  }
});

test('CSS Fallback: Khai báo @supports fallback cho trình duyệt không hỗ trợ', () => {
  const utilCss = fs.readFileSync(path.join(ROOT_DIR, 'client', 'src', 'styles', 'utilities.css'), 'utf8');

  assert.ok(
    utilCss.includes('@supports not') && utilCss.includes('backdrop-filter'),
    'utilities.css phải có @supports not cho backdrop-filter'
  );
  assert.ok(
    utilCss.includes('@supports not') && utilCss.includes('100dvh'),
    'utilities.css phải có @supports not cho dynamic viewport 100dvh'
  );
});
