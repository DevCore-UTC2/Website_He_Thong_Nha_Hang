/**
 * UNIT TEST: RESPONSIVE 6 BREAKPOINTS & MOBILE BOTTOM SHEET (T26)
 * Kiểm tra các tiêu chuẩn responsive theo Rubric:
 * 1. Đủ 6 breakpoints: 360, 390, 768, 1024, 1280, 1536px
 * 2. Chống scroll ngang (overflow-x: hidden, max-width: 100vw)
 * 3. Modal trên mobile chuyển thành Bottom Sheet (translateY, flex-end, border-radius đỉnh)
 * 4. Vùng chạm (Tap Target) tối thiểu 44x44px (WCAG 2.5.5 / 2.5.8)
 * 5. Font size ô nhập liệu input/select/textarea ≥ 16px trên mobile
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const responsiveCssPath = path.join(__dirname, '../client/src/styles/responsive.css');
const baseCssPath = path.join(__dirname, '../client/src/styles/base.css');
const indexHtmlPath = path.join(__dirname, '../client/index.html');

test('File responsive.css và base.css tồn tại và được nhúng trong index.html', () => {
  assert.ok(fs.existsSync(responsiveCssPath), 'Thiếu file responsive.css');
  assert.ok(fs.existsSync(baseCssPath), 'Thiếu file base.css');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.ok(indexHtml.includes('responsive.css'), 'index.html chưa nhúng responsive.css');
  assert.ok(indexHtml.includes('base.css'), 'index.html chưa nhúng base.css');
});

test('Kiểm tra 6 breakpoints được định nghĩa đầy đủ trong responsive.css', () => {
  const css = fs.readFileSync(responsiveCssPath, 'utf8');

  // 1. Breakpoint 360px & 390px (màn hình nhỏ)
  assert.ok(css.includes('390px'), 'Thiếu media query cho breakpoint 390px');
  assert.ok(css.includes('360px') || css.includes('max-width: 390px'), 'Thiếu hỗ trợ cho 360px');

  // 2. Breakpoint 768px (tablet portrait)
  assert.ok(css.includes('768px'), 'Thiếu media query cho breakpoint 768px');

  // 3. Breakpoint 1024px (tablet landscape)
  assert.ok(css.includes('1024px'), 'Thiếu media query cho breakpoint 1024px');

  // 4. Breakpoint 1280px (desktop tiêu chuẩn)
  assert.ok(css.includes('1280px'), 'Thiếu media query cho breakpoint 1280px');

  // 5. Breakpoint 1536px (desktop màn hình lớn)
  assert.ok(css.includes('1536px'), 'Thiếu media query cho breakpoint 1536px');
});

test('Chống cuộn ngang (No Horizontal Scroll)', () => {
  const responsiveCss = fs.readFileSync(responsiveCssPath, 'utf8');
  const baseCss = fs.readFileSync(baseCssPath, 'utf8');
  const combined = responsiveCss + '\n' + baseCss;

  // Kiểm tra overflow-x: hidden trên html/body
  assert.ok(combined.includes('overflow-x: hidden'), 'Chưa cấu hình overflow-x: hidden để chặn cuộn ngang');
  assert.ok(combined.includes('max-width: 100%') || combined.includes('max-width: 100vw'), 'Chưa giới hạn max-width');
});

test('Modal trên mobile chuyển thành Bottom Sheet', () => {
  const css = fs.readFileSync(responsiveCssPath, 'utf8');

  // Phải căn chỉnh modal-backdrop xuống đáy
  assert.ok(css.includes('align-items: flex-end'), 'Bottom sheet phải căn đáy với align-items: flex-end');

  // Hiệu ứng trượt từ đáy lên translateY(100%) -> translateY(0)
  assert.ok(css.includes('translateY'), 'Thiếu hiệu ứng trượt translateY cho bottom sheet');

  // Bo góc trên
  assert.ok(css.includes('border-radius: 24px 24px 0 0') || css.includes('border-radius: 20px 20px 0 0'), 'Thiếu bo góc trên cho bottom sheet');
});

test('Tap target tối thiểu 44x44px theo WCAG 2.5.5 / 2.5.8', () => {
  const responsiveCss = fs.readFileSync(responsiveCssPath, 'utf8');
  const baseCss = fs.readFileSync(baseCssPath, 'utf8');
  const combined = responsiveCss + '\n' + baseCss;

  assert.ok(combined.includes('min-height: 44px'), 'Thiếu min-height: 44px cho các nút bấm và ô nhập liệu');
  assert.ok(combined.includes('min-width: 44px'), 'Thiếu min-width: 44px cho nút icon');
});

test('Font size ô nhập liệu input/select/textarea ≥ 16px trên mobile', () => {
  const css = fs.readFileSync(responsiveCssPath, 'utf8');
  assert.ok(css.includes('font-size: 16px'), 'Thiếu font-size: 16px trên mobile để chống iOS Safari zoom');
});
