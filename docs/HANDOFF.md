# TÀI LIỆU BÀN GIAO TIẾN ĐỘ DỰ ÁN — VỊ NHÀ MÌNH

## Phiên làm việc: 2026-11-05 (Fix & Optimize Toàn Diện theo Master Prompt)
- Task vừa hoàn thành:
  + **T5.1 (Store Status)**: Hệ thống điều khiển trạng thái mở/đóng cửa và nhận đơn thống nhất tại máy chủ (3 chế độ `auto`, `force_open`, `force_closed`). Quản trị viên kiểm soát toàn quyền trong Admin Manager. Đồng bộ thời gian thực qua Socket.IO `store:status_change`. Chuẩn hóa giờ hoạt động theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
  + **T5.2 (Cart Separation)**: Phân tách giỏ hàng đa vai trò (Khách vãng lai, Thành viên, Nhân viên, Quản trị viên). Chỉ khách hàng thành viên mới gộp giỏ vãng lai khi đăng nhập; nhân viên và quản trị viên không bị lẫn giỏ hàng. Server là nguồn sự thật: bọc trong SQLite Transaction, kiểm tra món còn/hết, tính lại đơn giá thật từ DB (bỏ qua giá client gửi), clamp số lượng 1–99, sanitize ghi chú món chống XSS, đồng bộ giỏ hàng đa tab (storage event) và debounce 400ms.
  + **T5.3 (Reservation Standardizations)**: Chuẩn hóa quy tắc đặt bàn & tiệc: áp dụng múi giờ Việt Nam 09:00 – 21:00 độc lập với OS server; thời gian đặt trước ít nhất 1 giờ và tối đa 30 ngày; cấu hình thời lượng theo từng loại tiệc (`normal`: 120p, `family`: 150p, `birthday`: 180p, `corporate`: 180p, `wedding`: 240p); kiểm tra sức chứa bàn (`capacity >= guest_count`); thuật toán chống trùng lịch đặt bàn theo khoảng thời gian tiệc; ngăn chặn việc khóa trạng thái bàn sang `reserved` quá sớm đối với các ngày tương lai.
  + **T5.4 (Order Tracking & Invoice Authorization)**: Phân quyền tra cứu đơn hàng và hóa đơn: khách hàng chỉ tra cứu đơn của chính mình; khách vãng lai tra cứu đơn của tài khoản thành viên bắt buộc xác thực số điện thoại đặt hàng; tài khoản khách hàng khác truy cập bị từ chối 403 Forbidden; bảo vệ endpoint hóa đơn điện tử `/api/invoices/by-order/:orderCode`. Nâng cấp giao diện modal theo dõi đơn hàng hỗ trợ dropdown chọn chuyển đổi giữa các đơn hàng gần đây của khách (`Đơn của bạn (N)`).
  + **T5.5 (Comprehensive Verification)**: Viết suite kiểm thử chuyên sâu `tests/store_cart_reservation.test.js` kiểm tra 9 ca kiểm thử cốt lõi; chạy `npm test` đạt 119/119 tests pass (12 suites); chạy `npm run lint` đạt 0 lỗi 0 cảnh báo trên 103 files; chạy `npm run build` tạo bundle production hoàn chỉnh trong `client/dist/`.

- File đã thay đổi / tạo mới:
  + `server/migrations/008_store_settings.sql` (Tạo mới)
  + `server/services/storeStatusService.js` (Tạo mới)
  + `server/controllers/storeController.js` (Tạo mới)
  + `server/routes/storeRoutes.js` (Tạo mới)
  + `server/app.js` (Đăng ký routes & service cửa hàng)
  + `server/controllers/orderController.js` (Store status check & phân quyền theo dõi đơn)
  + `server/routes/orderRoutes.js` (Bổ sung optionalToken cho `/track/:code`)
  + `server/controllers/invoiceController.js` (Phân quyền truy cập hóa đơn)
  + `server/routes/invoiceRoutes.js` (Bảo vệ API hóa đơn theo đơn hàng)
  + `server/controllers/cartController.js` (Transaction SQLite, tính giá từ DB, clamp số lượng, sanitize XSS)
  + `client/src/services/cart.js` (Phân tách storage keys theo vai trò, debounce sync, đồng bộ đa tab)
  + `shared/validators.js` (Cấu hình loại tiệc, giờ phục vụ, hàm validateReservationTime)
  + `server/controllers/reservationController.js` (Chuẩn hóa giờ đặt bàn, sức chứa, chống trùng lịch)
  + `client/src/pages/customer/ReservationModal.js` (Giao diện đặt bàn & tiệc, validate trước khi gửi)
  + `client/src/pages/customer/OrderTrackingModal.js` (Hỗ trợ nhiều đơn, giao diện khi bị từ chối 403)
  + `client/src/pages/admin/AdminManager.js` (Thanh điều khiển Store Status Control Bar)
  + `client/src/main.js` (Lắng nghe socket store status, cập nhật pill trạng thái)
  + `tests/store_cart_reservation.test.js` (Tạo mới: 9/9 tests pass)
  + `tests/t41_full_flow.test.js` (Cập nhật kiểm thử phân quyền theo dõi đơn)
  + `FIX_PROGRESS.md` & `docs/TASKS.md` & `docs/HANDOFF.md`

- Kết quả kiểm thử:
  + `npm test`: 119/119 tests pass (12 test suites, 0 fail).
  + `npm run lint`: 103 files sạch sẽ, 0 errors, 0 warnings.
  + `npm run build`: Build production thành công trong 123ms, bundle minify kèm content hash.

---

## Phiên làm việc trước: 2026-11-04 (T1.1 đến T4.1)
- Task vừa hoàn thành:
  T4.1 — Chạy thử toàn bộ luồng chính (đăng nhập, đặt món, bếp bằng cả admin và nhân viên, trạng thái đơn, admin modal), ghi kết quả vào HANDOFF.md, tick hết TASKS.md.

- Task đang dở (nếu có) và đang dở ở bước nào:
  Không có. Tất cả các task trong danh sách (T1.1 đến T4.1) đã hoàn thành 100%.

- Task kế tiếp cần làm:
  Không còn task tồn đọng. Toàn bộ các yêu cầu của dự án đã hoàn tất và kiểm thử thành công.

- File đã thay đổi trong phiên này:
  + `client/src/components/AuthModal.js` (T3.3)
  + `client/src/main.js` (T3.4)
  + `client/src/styles/utilities.css` (T3.3, T3.4)
  + `tests/t33_auth_form_feedback.test.js` (T3.3)
  + `tests/t34_micro_interactions.test.js` (T3.4)
  + `tests/t41_full_flow.test.js` (T4.1)
  + `Web_nha_hang_test/docs/TASKS.md` & `TASKS.md` (T3.3, T3.4, T4.1)
  + `Web_nha_hang_test/docs/HANDOFF.md` & `HANDOFF.md` (T3.3, T3.4, T4.1)

- Quyết định kỹ thuật quan trọng (và lý do):
  + **T3.3**:
    - Khi form đăng nhập thiếu dữ liệu hoặc sai tài khoản/mật khẩu: gọi `triggerShake(loginForm)` và `triggerInputError(loginPassword)` tạo hiệu ứng rung lắc báo lỗi trực quan kèm rung xúc giác `[20, 40, 20]`.
    - Khi click ra backdrop ngoài modal Auth: gọi `triggerBounce(box)` tạo hiệu ứng nảy nhẹ cảnh báo không đóng modal bằng click ngoài để tránh mất dữ liệu nháp của người dùng.
    - Input lỗi được viền đỏ nổi bật, đổ bóng đỏ cảnh báo và tự động gỡ khi người dùng nhập lại.
  + **T3.4**:
    - Giỏ hàng nảy nhẹ (`triggerBounce`) mỗi khi số lượng món thay đổi qua sự kiện `cart:change`.
    - Hover thẻ món `.card-hover`: Thêm `translateY(-4px)`, đổ bóng `var(--shadow-xl)` và zoom nhẹ ảnh `scale(1.04)`, bọc trong `@media (hover: hover) and (pointer: fine)`.
    - Toast trượt mượt mà (slide-in) và fade-out trượt ra khi ẩn.
    - Modal fade và scale mượt mà từ `scale(0.95)` lên `scale(1)`.
    - Toàn bộ micro-interactions tôn trọng `prefers-reduced-motion: reduce`.
  + **T4.1**:
    - Xây dựng suite kiểm thử tích hợp toàn diện End-to-End (`tests/t41_full_flow.test.js`) kiểm tra trọn vẹn 5 chặng:
      1. Đăng nhập thành công cả 3 role (Admin, Staff, Customer), cấp JWT token chuẩn.
      2. Khách hàng tạo đơn hàng mới (status = `received`).
      3. Nhân viên và Admin điều phối món trên màn hình bếp theo luồng tuần tự (`received` -> `cooking` -> `ready` -> `serving` -> `completed`); chặn khách hàng đổi trạng thái bếp (403).
      4. Khách hàng tra cứu trạng thái đơn hàng (qua mã tracking và lịch sử đơn), trạng thái tự động hoàn tất khi toàn bộ món được phục vụ.
      5. Modal Quản trị (Admin Manager) hiển thị đầy đủ các tab, căn chỉnh đồng đều, không bị cắt chữ và không bị scrollbar ngang.

- Cách chạy/kiểm thử nhanh:
  + Chạy server: `cd Web_nha_hang_test && npm start` (hoặc click đúp file `CHAY_WEB.bat`).
  + Build assets: `cd Web_nha_hang_test && node scripts/build.js`.
  + Unit tests: `cd Web_nha_hang_test && npm test` (119/119 tests passed across 12 suites).
  + Linter: `cd Web_nha_hang_test && npm run lint` (103 files clean, 0 errors, 0 warnings).

- Lỗi đã biết / bị chặn:
  Không có.

- Phát hiện ngoài phạm vi (KHÔNG tự sửa):
  Không có.
