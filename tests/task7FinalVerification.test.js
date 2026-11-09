const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

describe('Task 7: Kiểm tra cuối (Final End-to-End Verification)', () => {
  const indexHtml = fs.readFileSync('client/index.html', 'utf8');
  const mainJs = fs.readFileSync('client/src/main.js', 'utf8');
  const utilitiesCss = fs.readFileSync('client/src/styles/utilities.css', 'utf8');
  const responsiveCss = fs.readFileSync('client/src/styles/responsive.css', 'utf8');
  const orderTrackingJs = fs.readFileSync('client/src/pages/customer/OrderTrackingModal.js', 'utf8');
  const kitchenJs = fs.readFileSync('client/src/pages/staff/KitchenDisplay.js', 'utf8');
  const adminJs = fs.readFileSync('client/src/pages/admin/AdminManager.js', 'utf8');

  test('1. Header & Sidebar dùng chung cho mọi role (Task 4)', () => {
    // Header có nút toggle sidebar và các thành phần cốt lõi
    assert.ok(indexHtml.includes('id="btn-toggle-sidebar"'), 'Có nút hamburger #btn-toggle-sidebar');
    assert.ok(indexHtml.includes('id="app-sidebar"'), 'Có khung #app-sidebar');
    assert.ok(indexHtml.includes('id="sidebar-overlay"'), 'Có #sidebar-overlay');
    assert.ok(indexHtml.includes('id="btn-header-order-status"'), 'Có nút Theo Dõi Đơn trên header');

    // Header user container chỉ giữ badge vai trò
    assert.ok(mainJs.includes('header-user-badge'), 'Có badge vai trò #header-user-badge trong header');
    assert.ok(mainJs.includes('openSidebar'), 'Hàm openSidebar được xuất và gán');
    assert.ok(mainJs.includes('closeSidebar'), 'Hàm closeSidebar được xuất và gán');

    // Sidebar có đầy đủ các section theo role
    assert.ok(mainJs.includes('sidebar-nav-menu'), 'Sidebar có Thực Đơn');
    assert.ok(mainJs.includes('sidebar-nav-family-meal'), 'Sidebar có Mâm Cơm Gia Đình');
    assert.ok(mainJs.includes('sidebar-nav-reservation'), 'Sidebar có Đặt Bàn');
    assert.ok(mainJs.includes('sidebar-nav-invoice'), 'Sidebar có Tra Cứu Hóa Đơn');
    assert.ok(mainJs.includes('sidebar-nav-order-status'), 'Sidebar có Xem Trạng Thái Đơn Hàng');
    assert.ok(mainJs.includes('sidebar-nav-kitchen'), 'Sidebar có Màn Hình Bếp (nhân viên)');
    assert.ok(mainJs.includes('sidebar-nav-tables'), 'Sidebar có Sơ Đồ Bàn (nhân viên)');
    assert.ok(mainJs.includes('sidebar-nav-admin'), 'Sidebar có Quản Trị (admin)');
  });

  test('2. Hủy đơn qua modal riêng & Xem trạng thái đơn gần nhất (Task 5)', () => {
    // Không còn prompt() trong OrderTrackingModal.js
    assert.ok(!orderTrackingJs.includes('prompt('), 'OrderTrackingModal.js không còn lệnh prompt()');

    // Có modal hủy đơn riêng biệt với các lý do chuẩn
    assert.ok(orderTrackingJs.includes('openCancelOrderModal'), 'Có hàm openCancelOrderModal');
    assert.ok(orderTrackingJs.includes('Tôi muốn đổi món'), 'Có lý do Tôi muốn đổi món');
    assert.ok(orderTrackingJs.includes('Đặt nhầm'), 'Có lý do Đặt nhầm');
    assert.ok(orderTrackingJs.includes('Chờ quá lâu'), 'Có lý do Chờ quá lâu');
    assert.ok(orderTrackingJs.includes('cancel-custom-reason-input'), 'Có textarea cho Lý do khác');

    // Có hàm xem lại đơn gần nhất
    assert.ok(orderTrackingJs.includes('openRecentOrderStatus'), 'Có xuất hàm openRecentOrderStatus');
    assert.ok(orderTrackingJs.includes('vnm_last_order_code'), 'Lưu và đọc vnm_last_order_code trong localStorage');
  });

  test('3. Màn hình bếp (Kitchen Display) realtime (Task 1)', () => {
    assert.ok(kitchenJs.includes('openKitchenDisplay'), 'KitchenDisplay có hàm openKitchenDisplay');
    assert.ok(kitchenJs.includes('order:new'), 'Có lắng nghe sự kiện order:new');
    assert.ok(kitchenJs.includes('order:status'), 'Có lắng nghe sự kiện order:status');
    assert.ok(mainJs.includes('window.openKitchenDisplay = openKitchenDisplay'), 'openKitchenDisplay gắn vào window');
  });

  test('4. Modal Quản trị và Giỏ hàng (Task 2 & Nhóm 1)', () => {
    // Thanh tab quản trị tự xuống dòng flex-wrap, không scrollbar
    assert.ok(adminJs.includes('flex-wrap: wrap'), 'Tab quản trị có flex-wrap: wrap');

    // Giỏ hàng tự co giãn
    assert.ok(utilitiesCss.includes('.cart-item-card'), 'CSS có lớp .cart-item-card');
    assert.ok(utilitiesCss.includes('height: auto !important'), '.cart-item-card có height auto');
    assert.ok(utilitiesCss.includes('overflow: visible !important'), '.cart-item-card có overflow visible');
  });

  test('5. Dọn dẹp codebase sạch sẽ (Task 6)', () => {
    assert.ok(!fs.existsSync('server/restaurant.sqlite.bak'), 'Không còn file backup CSDL tạm');
    assert.ok(!fs.existsSync('scripts/analyze_menu_images.js'), 'Không còn file analyze_menu_images.js');
    assert.ok(!fs.existsSync('scripts/process_image.ps1'), 'Không còn file process_image.ps1');
    assert.ok(fs.existsSync('server/restaurant.sqlite'), 'CSDL chính restaurant.sqlite được bảo toàn');
  });

  test('6. Responsive và chống cuộn ngang (T26 & Task 4)', () => {
    assert.ok(responsiveCss.includes('overflow-x: hidden'), 'Chống cuộn ngang html, body');
    assert.ok(responsiveCss.includes('max-width: 100vw'), 'Giới hạn 100vw');
    assert.ok(responsiveCss.includes('min-height: 44px'), 'Tap target tối thiểu 44px');
    assert.ok(responsiveCss.includes('#btn-toggle-sidebar'), 'Nút hamburger được định nghĩa responsive');
  });
});
