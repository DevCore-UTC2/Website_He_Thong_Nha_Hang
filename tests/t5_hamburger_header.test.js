const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

describe('TASK 5: Căn chỉnh nút hamburger mở sidebar trên header & Xóa viền đỏ', () => {
  const indexHtml = fs.readFileSync('client/index.html', 'utf8');
  const utilitiesCss = fs.readFileSync('client/src/styles/utilities.css', 'utf8');
  const responsiveCss = fs.readFileSync('client/src/styles/responsive.css', 'utf8');
  const mainJs = fs.readFileSync('client/src/main.js', 'utf8');

  test('5.1 Kích thước và căn giữa dọc nút hamburger (#btn-toggle-sidebar / .hamburger-btn)', () => {
    // Nút có kích thước chuẩn tối thiểu 44x44px cho cảm ứng
    assert.ok(utilitiesCss.includes('width: 44px'), 'utilities.css có width: 44px');
    assert.ok(utilitiesCss.includes('height: 44px'), 'utilities.css có height: 44px');
    assert.ok(utilitiesCss.includes('min-width: 44px'), 'utilities.css có min-width: 44px');
    assert.ok(utilitiesCss.includes('min-height: 44px'), 'utilities.css có min-height: 44px');
    assert.ok(utilitiesCss.includes('box-sizing: border-box'), 'utilities.css có box-sizing: border-box');

    // Căn giữa trục dọc và ngang bằng inline-flex
    assert.ok(utilitiesCss.includes('display: inline-flex'), 'utilities.css có display: inline-flex');
    assert.ok(utilitiesCss.includes('align-items: center'), 'utilities.css có align-items: center');
    assert.ok(utilitiesCss.includes('justify-content: center'), 'utilities.css có justify-content: center');

    // Trong index.html header actions cũng có cấu hình căn giữa thẳng hàng
    assert.ok(indexHtml.includes('#btn-toggle-sidebar'), 'index.html có CSS cho #btn-toggle-sidebar');
    assert.ok(indexHtml.includes('align-items: center'), 'index.html có align-items: center cho header actions');
  });

  test('5.2 Căn giữa 3 gạch bên trong nút (cả ngang và dọc)', () => {
    // .hamburger-box có flex căn giữa và kích thước chuẩn
    assert.ok(utilitiesCss.includes('.hamburger-box'), 'Có định nghĩa .hamburger-box');
    assert.ok(utilitiesCss.includes('width: 20px'), '.hamburger-box có width: 20px');
    assert.ok(utilitiesCss.includes('height: 16px'), '.hamburger-box có height: 16px');

    // .hamburger-inner và các thanh con có left: 0 và căn giữa
    assert.ok(utilitiesCss.includes('.hamburger-inner'), 'Có định nghĩa .hamburger-inner');
    assert.ok(utilitiesCss.includes('top: 50%'), 'Thanh giữa căn top 50%');
    assert.ok(utilitiesCss.includes('transform: translateY(-50%)'), 'Thanh giữa dịch chuyển translateY(-50%)');
    assert.ok(utilitiesCss.includes('top: -7px'), 'Thanh trên cách đều đối xứng -7px');
    assert.ok(utilitiesCss.includes('top: 7px'), 'Thanh dưới cách đều đối xứng +7px');
  });

  test('5.3 Xóa/sửa viền đỏ: viền vàng gold tinh tế & outline focus-visible chuẩn a11y', () => {
    // Viền nút dùng vàng gold hài hòa với header
    assert.ok(utilitiesCss.includes('rgba(214, 163, 74, 0.3)'), 'Nút dùng viền vàng gold mờ rgba(214, 163, 74, 0.3)');
    assert.ok(utilitiesCss.includes('border-color: #D6A34A'), 'Khi hover đổi sang viền vàng gold #D6A34A');

    // Không còn outline đỏ khi click chuột/focus
    assert.ok(utilitiesCss.includes('outline: 2px solid var(--color-accent, #D6A34A)'), 'Focus-visible dùng outline vàng #D6A34A chuẩn a11y');
    assert.ok(utilitiesCss.includes('outline: none !important'), 'Click chuột loại bỏ outline không mong muốn');
  });

  test('5.4 Khoảng cách mép phải, không bị ẩn display:none trên desktop và mobile chuẩn 44x44px', () => {
    // Nút hamburger trong HTML không còn inline style="display: none;"
    const buttonHtmlMatch = indexHtml.match(/<button id="btn-toggle-sidebar"[^>]*>/);
    assert.ok(buttonHtmlMatch, 'Tìm thấy thẻ <button id="btn-toggle-sidebar">');
    assert.ok(!buttonHtmlMatch[0].includes('display: none'), 'Nút không bị ẩn bởi inline style="display: none;"');

    // Responsive mobile đảm bảo chuẩn chạm tối thiểu 44x44px
    assert.ok(responsiveCss.includes('#btn-toggle-sidebar'), 'responsive.css định nghĩa #btn-toggle-sidebar');
    assert.ok(responsiveCss.includes('min-width: 44px !important'), 'responsive.css có min-width 44px');
    assert.ok(responsiveCss.includes('min-height: 44px !important'), 'responsive.css có min-height 44px');

    // main.js giữ nút hiển thị cho người dùng cả desktop lẫn mobile
    assert.ok(mainJs.includes('toggleSidebarBtn.style.display = \'inline-flex\''), 'main.js hiển thị toggleSidebarBtn');
  });
});
