/**
 * UNIT TEST: ACCESSIBILITY (WCAG 2.1 AA — T30)
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', 'client');
const stylesDir = path.join(clientDir, 'src', 'styles');

test('Skip link: tồn tại, liên kết đúng đích và có CSS focus-visible', () => {
  const indexHtml = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf8');
  const baseCss = fs.readFileSync(path.join(stylesDir, 'base.css'), 'utf8');

  // Skip link trong index.html
  assert.ok(
    indexHtml.includes('class="skip-link"'),
    'Thiếu class="skip-link" trong index.html'
  );
  assert.ok(
    indexHtml.includes('href="#menu-section"') || indexHtml.includes('href="#main-content"'),
    'Skip link phải trỏ tới landmark chính (#menu-section hoặc #main-content)'
  );

  // Đích của skip link phải có tabindex="-1" để nhận focus
  assert.ok(
    indexHtml.includes('id="menu-section"') && indexHtml.includes('tabindex="-1"'),
    'Khu vực đích của skip link phải có tabindex="-1"'
  );

  // CSS skip-link phải có trạng thái :focus hoặc :focus-visible
  assert.ok(
    baseCss.includes('.skip-link:focus') || baseCss.includes('.skip-link:focus-visible'),
    'Thiếu trạng thái .skip-link:focus trong base.css'
  );
});

test('Trạng thái :focus-visible tương phản cao (WCAG 2.4.7 Focus Visible)', () => {
  const baseCss = fs.readFileSync(path.join(stylesDir, 'base.css'), 'utf8');

  assert.ok(
    baseCss.includes(':focus-visible'),
    'Thiếu bộ quy tắc :focus-visible trong base.css'
  );
  assert.ok(
    baseCss.includes('outline: 2px solid') || baseCss.includes('outline: 3px solid') || baseCss.includes('outline:'),
    ':focus-visible phải có outline rõ ràng'
  );
});

test('Thứ bậc heading không nhảy cóc trong index.html (WCAG 1.3.1)', () => {
  const indexHtml = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf8');

  // Tìm tất cả các thẻ heading h1..h6 theo thứ tự xuất hiện
  const headingRegex = /<h([1-6])\b[^>]*>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(indexHtml)) !== null) {
    headings.push(parseInt(match[1], 10));
  }

  assert.ok(headings.length > 0, 'index.html phải có thẻ heading');
  assert.equal(headings.filter(h => h === 1).length, 1, 'Trang chủ chỉ nên có duy nhất 1 thẻ <h1>');

  // Kiểm tra không nhảy cóc (ví dụ h1 -> h3 là vi phạm)
  for (let i = 0; i < headings.length - 1; i++) {
    const current = headings[i];
    const next = headings[i + 1];
    // next có thể nhỏ hơn hoặc bằng (lùi cấp) hoặc lớn hơn tối đa 1 cấp (current + 1)
    assert.ok(
      next <= current + 1,
      `Phát hiện nhảy bậc heading từ <h${current}> sang <h${next}> tại chỉ mục ${i}`
    );
  }
});

test('Tất cả thẻ <img> trong index.html phải có thuộc tính alt (WCAG 1.1.1)', () => {
  const indexHtml = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf8');
  const imgRegex = /<img\b([^>]*)>/gi;

  let imgMatch;
  let count = 0;
  while ((imgMatch = imgRegex.exec(indexHtml)) !== null) {
    count++;
    const attrs = imgMatch[1];
    assert.ok(
      /\balt\s*=\s*["'][^"']*["']/i.test(attrs),
      `Thẻ <img> thiếu thuộc tính alt: "${imgMatch[0]}"`
    );
  }
  assert.ok(count > 0, 'Phải có ít nhất 1 thẻ <img> để kiểm tra');
});

test('Toast notifications có aria-live="polite" và role="status"', () => {
  const toastJs = fs.readFileSync(path.join(clientDir, 'src', 'components', 'Toast.js'), 'utf8');

  assert.ok(toastJs.includes('aria-live'), 'Toast.js phải có aria-live');
  assert.ok(toastJs.includes('aria-atomic'), 'Toast.js phải có aria-atomic');
  assert.ok(toastJs.includes('role="status"') || toastJs.includes('role="alert"'), 'Toast.js phải có role status hoặc alert');
});

test('Modal CartDrawer và AuthModal có role="dialog" và aria-modal="true"', () => {
  const cartDrawerJs = fs.readFileSync(path.join(clientDir, 'src', 'pages', 'customer', 'CartDrawer.js'), 'utf8');
  const authModalJs = fs.readFileSync(path.join(clientDir, 'src', 'components', 'AuthModal.js'), 'utf8');

  assert.ok(cartDrawerJs.includes('role="dialog"'), 'CartDrawer phải có role="dialog"');
  assert.ok(cartDrawerJs.includes('aria-modal="true"'), 'CartDrawer phải có aria-modal="true"');

  assert.ok(authModalJs.includes('role="dialog"'), 'AuthModal phải có role="dialog"');
  assert.ok(authModalJs.includes('aria-modal="true"'), 'AuthModal phải có aria-modal="true"');
});

test('Trang 404 thân thiện tồn tại và tuân thủ semantic HTML5 & a11y', () => {
  const notFoundPath = path.join(clientDir, '404.html');
  assert.ok(fs.existsSync(notFoundPath), 'File client/404.html phải tồn tại');

  const html = fs.readFileSync(notFoundPath, 'utf8');
  assert.ok(html.includes('lang="vi"'), '404.html phải có lang="vi"');
  assert.ok(html.includes('<title>'), '404.html phải có <title>');
  assert.ok(/<h1\b/i.test(html), '404.html phải có thẻ <h1>');
  assert.ok(html.includes('skip-link'), '404.html phải có skip link');
  assert.ok(html.includes('role="banner"'), '404.html phải có role="banner"');
  assert.ok(html.includes('role="contentinfo"'), '404.html phải có role="contentinfo"');
});
