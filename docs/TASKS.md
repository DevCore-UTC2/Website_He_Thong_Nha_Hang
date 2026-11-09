# TASKS — Vị Nhà Mình

## Trạng thái

### NHÓM 1 – Dọn thanh trượt ở modal "Hệ Thống Quản Trị Nhà Hàng Toàn Diện"
- [x] **T1.1** — Tìm CSS/HTML của hàng tab trong modal admin; xác định nguyên nhân gây ra scrollbar. (Đã hoàn thành: 2026-11-03 07:28 — File phân tích: `client/src/pages/admin/AdminManager.js`)
- [x] **T1.2** — Bỏ thanh trượt ngang và dọc ở hàng tab. Cho các tab tự xuống dòng (flex-wrap) hoặc co giãn đều (grid/flex) để hiển thị đủ tất cả tab, không bị cắt chữ. (Đã hoàn thành: 2026-11-03 07:30 — File đã sửa: `client/src/pages/admin/AdminManager.js`, `tests/task7FinalVerification.test.js`)
- [x] **T1.3** — Căn chỉnh lại: tab cao đồng đều, icon + chữ thẳng hàng, khoảng cách đều, tab đang chọn nổi bật, hoạt động tốt ở màn hình rộng và màn hình điện thoại (kiểm tra ở ~375px). (Đã hoàn thành: 2026-11-03 07:32 — File đã sửa: `client/src/pages/admin/AdminManager.js`, `client/src/styles/utilities.css`, `client/src/styles/responsive.css`)

### NHÓM 2 – Xây dựng lại Menu Bếp
- [x] **T2.1** — CHẨN ĐOÁN lỗi thông báo "Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc" (Đã hoàn thành: 2026-11-03 07:34 — Đã xác định chính xác nguyên nhân gốc tại `client/src/services/api.js:21`, `KitchenDisplay.js:19`, `server/middlewares/authMiddleware.js:32-35`; KHÔNG sửa code ở task này theo đúng quy tắc).
- [x] **T2.2** — Sửa đúng nguyên nhân gốc đã ghi ở T2.1, theo cách sửa nhỏ nhất (bổ sung key 'vnm_token' vào client/src/services/api.js, KitchenDisplay.js và AdminManager.js; kiểm thử bằng cả 2 tài khoản admin và nhân viên; đóng modal bếp, toast cảnh báo và mở auth modal nếu hết hạn). (Đã hoàn thành: 2026-11-03 07:41 — File đã sửa: `client/src/services/api.js`, `client/src/pages/staff/KitchenDisplay.js`, `client/src/pages/admin/AdminManager.js`)
- [x] **T2.3** — Backend: tạo/chỉnh API cho bếp (lấy danh sách món theo hóa đơn của mọi tài khoản đã đặt, đổi trạng thái món theo luồng: Chưa nấu -> Đang nấu -> Đã nấu xong -> Phục vụ ra bàn; chặn nhảy cóc và lùi trạng thái; lưu thời điểm thay đổi). (Đã hoàn thành: 2026-11-03 07:50 — File đã sửa: `server/migrations/006_kitchen_item_status.sql`, `server/config/db.js`, `server/controllers/orderController.js`, `server/routes/orderRoutes.js`, `tests/t23_kitchen_backend.test.js`)
- [x] **T2.4** — Frontend menu bếp: hiển thị món theo 4 cột/nhóm (Chưa nấu / Đang nấu / Đã nấu xong / Chờ phục vụ), nút chuyển bước kế, trạng thái rỗng thân thiện, sắp xếp món cũ nhất lên trước. (Đã hoàn thành: 2026-11-03 07:53 — File đã sửa: `client/src/pages/staff/KitchenDisplay.js`, `tests/t24_kitchen_frontend.test.js`)
- [x] **T2.5** — Nút "Phục vụ ra bàn": khi bấm, đánh dấu món hoàn tất, thẻ mờ dần và biến mất sau 5 giây (fade-out animation). (Đã hoàn thành: 2026-11-03 08:04 — File đã sửa: `client/src/styles/utilities.css`, `client/src/pages/staff/KitchenDisplay.js`, `tests/t25_serving_fadeout.test.js`)
- [x] **T2.6** — Đồng bộ với khách: cập nhật trạng thái đơn hàng ở trang "Trạng thái đơn hàng" của khách theo từng bước đến khi toàn bộ món được phục vụ (đơn hoàn tất). (Đã hoàn thành: 2026-11-03 08:07 — File đã sửa: `server/controllers/orderController.js`, `client/src/pages/customer/OrderTrackingModal.js`, `tests/t26_customer_sync.test.js`)
- [x] **T2.7** — Bếp tự làm mới danh sách (polling hoặc realtime) để đơn mới xuất hiện không cần reload, không nhấp nháy UI. (Đã hoàn thành: 2026-11-03 08:15 — File đã sửa: `client/src/pages/staff/KitchenDisplay.js`, `tests/t27_kitchen_autorefresh.test.js`)

### NHÓM 3 – Hiệu ứng rung và micro-interaction cho UI bớt nhàm
- [x] **T3.1** — Tạo MỘT module dùng chung (vd: `ui-feedback.js` + class CSS dùng chung) để các task sau chỉ gọi lại, không lặp code. (Đã hoàn thành: 2026-11-03 08:20 — File đã sửa: `client/src/utils/ui-feedback.js`, `client/src/styles/utilities.css`, `tests/t31_ui_feedback_module.test.js`)
- [x] **T3.2** — Rung nhẹ khi bấm nút: dùng `navigator.vibrate(10–15ms)` bọc kiểm tra hỗ trợ, hiệu ứng thị giác fallback `scale(0.96)` qua event delegation/class dùng chung. (Đã hoàn thành: 2026-11-03 08:24 — File đã sửa: `client/src/utils/ui-feedback.js`, `client/src/styles/utilities.css`, `client/src/main.js`, `tests/t32_button_haptic_press.test.js`)
- [x] **T3.3** — Form đăng nhập: shake khi lỗi, modal nảy nhẹ khi click ngoài, viền đỏ rung khi input lỗi. (Đã hoàn thành: 2026-11-03 08:28 — File đã sửa: `client/src/components/AuthModal.js`, `client/src/styles/utilities.css`, `tests/t33_auth_form_feedback.test.js`)
- [x] **T3.4** — Một vài micro-interaction bổ sung (giỏ hàng nảy, hover thẻ món, toast trượt mượt, modal fade/scale...). (Đã hoàn thành: 2026-11-03 08:32 — File đã sửa: `client/src/main.js`, `client/src/styles/utilities.css`, `tests/t34_micro_interactions.test.js`)

### TASK CUỐI
- [x] **T4.1** — Chạy thử toàn bộ luồng chính (đăng nhập, đặt món, bếp bằng cả admin và nhân viên, trạng thái đơn, admin modal), ghi kết quả vào HANDOFF.md, tick hết TASKS.md. (Đã hoàn thành: 2026-11-03 08:35 — File đã tạo: `tests/t41_full_flow.test.js`)

### NHÓM 5 – FIX & TỐI ƯU TOÀN DIỆN (THEO MASTER PROMPT 2026-11-05)
- [x] **T5.1** — Hệ thống điều khiển trạng thái mở/đóng cửa (Store Status Service, auto/force_open/force_closed, admin control, Socket.IO sync, pill realtime).
- [x] **T5.2** — Phân tách giỏ hàng đa người dùng & xác thực giá DB (Guest / Customer / Staff / Admin isolation, SQLite transaction, DB price recalculation, quantity clamping 1-99, note XSS sanitization, debounced sync 400ms).
- [x] **T5.3** — Chuẩn hóa quy tắc đặt bàn & loại tiệc (Múi giờ Việt Nam 09:00 - 21:00 độc lập OS, lead time >= 1h, sức chứa bàn, chống trùng lịch tiệc theo duration windows, ngăn chặn khóa bàn sớm cho ngày tương lai).
- [x] **T5.4** — Phân quyền tra cứu đơn hàng & hóa đơn điện tử (Chặn khách xem đơn của khách khác 403, khách vãng lai tra đơn thành viên yêu cầu SĐT, hỗ trợ xem nhiều đơn hàng cá nhân trong OrderTrackingModal, bảo vệ API hóa đơn).
- [x] **T5.5** — Kiểm thử toàn diện & Đóng gói sản phẩm (`tests/store_cart_reservation.test.js` 9/9 pass, tổng 119/119 unit tests pass, lint 0 lỗi trên 103 file, production build thành công).
