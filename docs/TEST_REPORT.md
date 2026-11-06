# BÁO CÁO KIỂM THỬ TOÀN DIỆN (TEST REPORT) — VỊ NHÀ MÌNH
*Cập nhật lúc: 03/11/2026 — Phiên bản hệ thống: 2.0.0*

---

## 1. Tổng Quan Kết Quả Kiểm Thử

| Chỉ số | Mục tiêu | Kết quả thực tế | Trạng thái |
| :--- | :---: | :---: | :---: |
| **Tổng số Unit Tests** | $\ge 25$ tests | **47 tests** | ✅ **100% PASS** |
| **Số Test Suites** | Toàn diện các module | **9 test files** | ✅ **100% PASS** |
| **Thời gian chạy test** | $< 2000$ms | **~640ms** | ⚡ Siêu nhanh |
| **Linter Code Quality** | 0 lỗi cú pháp / debug | **85 files quét sạch (0 lỗi, 0 cảnh báo)** | ✅ **100% CLEAN** |
| **Build Production** | Bundling & Hashing | **Hoàn tất trong 230ms** | 📦 **PASS** |

---

## 2. Chi Tiết Kết Quả Kiểm Thử Theo Từng Phân Hệ

### 2.1. Phân hệ Tiếp cận & Giao diện (A11y & Motion & Responsive)
*Các files kiểm thử: `tests/a11y.test.js`, `tests/motion.test.js`, `tests/responsive.test.js`, `tests/browserMatrix.test.js`*

1. **Accessibility (WCAG 2.1 AA — T30)**:
   - ✅ Skip link: Tồn tại, liên kết đúng `#menu-section` (`tabindex="-1"`), hiển thị tương phản cao khi bấm Tab.
   - ✅ `:focus-visible`: Outline 2px solid màu gạch đất nung rõ ràng cho mọi buttons, inputs, links, selects.
   - ✅ Thứ bậc Heading: Duy nhất 1 `<h1>` trên trang chủ, tuần tự `<h2>` $\rightarrow$ `<h3>`, 0 lỗi nhảy cóc.
   - ✅ Thẻ `<img>`: 100% ảnh có thuộc tính `alt` ngữ nghĩa; logo trang trí có `aria-hidden="true"`.
   - ✅ ARIA Roles: `role="dialog"` và `aria-modal="true"` trên CartDrawer, AuthModal, FamilyMealModal.
   - ✅ Toast Notification: Khai báo `role="status"`, `role="alert"`, `aria-live="polite"`, `aria-atomic="true"`.
   - ✅ Trang 404 thân thiện: File `client/404.html` semantic HTML5, `lang="vi"`, skip link, heading chuẩn.

2. **Motion & Chuyển động (T27)**:
   - ✅ Chỉ animate `transform` và `opacity`: GPU compositing, không gây layout reflow.
   - ✅ Tuyệt đối không `transition: all`: Khai báo tường minh từng thuộc tính CSS.
   - ✅ Không dùng `scale(0)`: Dùng `scale(0.95)` và `translateY` an toàn.
   - ✅ Hỗ trợ `prefers-reduced-motion: reduce`: Tắt toàn bộ chuyển động bảo vệ người nhạy cảm tiền đình.
   - ✅ Hỗ trợ `@media (hover: hover)`: Chống dính trạng thái hover trên màn hình cảm ứng di động.

3. **Responsive 6 Breakpoint & Mobile (T26 & T33)**:
   - ✅ Kiểm tra 6 Breakpoints: `360px`, `390px`, `768px`, `1024px`, `1280px`, `1536px`.
   - ✅ Chống cuộn ngang (No Horizontal Scroll): `html, body { overflow-x: hidden; max-width: 100vw; }`.
   - ✅ Modal chuyển đổi thành Bottom Sheet trên Mobile (≤ 640px) có pull-handle bar.
   - ✅ Tap target tối thiểu 44×44px (WCAG 2.5.5 / 2.5.8) cho toàn bộ phần tử tương tác.
   - ✅ Font ô nhập liệu ≥ 16px trên mobile chống iOS Safari tự động zoom trang.
   - ✅ CSS Fallbacks: Khai báo `-webkit-backdrop-filter` đi kèm `backdrop-filter`, `@supports not (backdrop-filter)` fallback màu nền mờ đục, `@supports not (height: 100dvh)` fallback `90vh`.

---

### 2.2. Phân hệ Tính Năng Sáng Tạo Nam Bộ (Mâm Cơm & Đang Vào Mùa)
*Các files kiểm thử: `tests/familyMeal.test.js`, `tests/season.test.js`*

1. **Mâm Cơm Gia Đình (T28)**:
   - ✅ Phân loại chuẩn 4 nhóm: Món Mặn, Món Canh, Món Rau/Xào, Món Tráng Miệng. Loại trừ đồ uống có cồn.
   - ✅ Nhận diện dị ứng 2 chiều: Khớp chính xác cả slug tiếng Anh (`shrimp`, `fish`, `peanuts`, `eggs`...) và tên tiếng Việt (`tôm`, `cá`, `đậu phộng`, `trứng`, `mắm`...).
   - ✅ Gợi ý mâm tròn đủ 4 món khác biệt, không trùng lặp.
   - ✅ Tính tất định (Deterministic): Cùng seed cho ra cùng một mâm cơm nhất quán.
   - ✅ Lọc bỏ thành công các món chứa dị ứng khi người dùng yêu cầu loại trừ.
   - ✅ Đổi món độc lập từng vị trí: Đổi món canh giữ nguyên 100% 3 món còn lại.
   - ✅ Khẩu phần ăn 2, 4, 6, 8 người và tính đúng tổng tiền.

2. **Món Đang Vào Mùa (T29)**:
   - ✅ Parse chuỗi `season_months` an toàn (JSON array hoặc mảng số nguyên).
   - ✅ Kiểm tra món đang đúng mùa theo tháng hệ thống (`Asia/Ho_Chi_Minh`).
   - ✅ Lọc danh sách món đang rộ vụ thu hoạch.
   - ✅ Trả về đúng thông tin mùa văn hóa ẩm thực miền Nam (Mùa nước nổi, mùa gặt lúa, mùa nắng ấm miệt vườn).
   - ✅ Cơ chế ghi đè tháng kiểm thử (Test month override qua URL param hoặc `sessionStorage`).

---

### 2.3. Phân hệ Kế Toán, Thuế VAT & Hóa Đơn Điện Tử (Nghị Định 123/2020)
*Các files kiểm thử: `tests/vatAndInvoice.test.js`, `tests/currencyToWords.test.js`*

1. **Thuế suất VAT hai mức & Bóc tách thuế**:
   - ✅ Thức ăn & nước giải khát: 8% (theo NĐ 72/2024 đến 31/12/2026).
   - ✅ Đồ uống có cồn (Rượu Gò Đen): 10%.
   - ✅ Kiểm thử ca thực tế bắt buộc: Cơm tấm 140.000đ (8%) + Rượu Gò Đen 150.000đ (10%) $\rightarrow$ Bóc tách chính xác từng đồng thuế.
   - ✅ Thuật toán phân bổ giảm giá phần dư lớn nhất (Largest Remainder Method) đảm bảo tổng tiền trước thuế + tổng thuế = tổng thanh toán (không lệch dù 1 đồng).

2. **Hóa đơn điện tử & Quy chuẩn kế toán**:
   - ✅ Cấp số hóa đơn tuần tự (8 chữ số, format `HD-00000001`) trong SQLite Transaction an toàn.
   - ✅ Lưu snapshot bất biến thông tin người bán DEMO và người mua.
   - ✅ Kiểm tra Mã số thuế (MST) Modulo 11 (hợp lệ cho doanh nghiệp thật và MST DEMO).
   - ✅ Hàm đọc số tiền thành chữ tiếng Việt chuẩn quy tắc kế toán (ví dụ: 290.000đ $\rightarrow$ "Hai trăm chín mươi nghìn đồng").

---

### 2.4. Phân hệ Build Pipeline & Chất Lượng Mã Nguồn
*Các files kiểm thử: `tests/lint.test.js`, `tests/build.test.js`*

1. **Linter & Code Quality (T31)**:
   - ✅ Cấu hình ESLint `.eslintrc.json` và Prettier `.prettierrc` chuẩn cú pháp ES2024.
   - ✅ Lệnh `npm run lint` thực thi thành công quét toàn bộ 85 file JS không có lỗi cú pháp, không có câu lệnh `debugger`, không có log debug nháp.

2. **Build Pipeline Production (T32)**:
   - ✅ Lệnh `npm run build` thực thi hoàn tất trong ~230ms.
   - ✅ Minify và gộp 5 file CSS ra bundle có hash `styles.[hash].min.css`.
   - ✅ Minify Entry point JS ra `main.[hash].min.js`.
   - ✅ Tự động tạo `client/dist/manifest.json` và `client/dist/index.html`.
   - ✅ Server Express tự động chuyển sang phục vụ bundle tĩnh khi `NODE_ENV=production`.

---

## 3. Hướng Dẫn Kiểm Thử Chức Năng Bằng Tay (Manual QA)

### 3.1. Hướng dẫn thử nghiệm đổi tháng mùa vụ (T29)
1. Khởi động server: `npm start` $\rightarrow$ truy cập `http://localhost:5000`.
2. Cuộn tới thanh điều khiển Thực đơn: Quan sát ô chọn **🌾 Mùa vụ: [Tháng 11 ▼]**.
3. **Kịch bản A (Mùa nước nổi)**: Chọn **Tháng 11** $\rightarrow$ Các món *Lẩu cá linh bông điên điển* và *Điên điển xào tép* hiện badge xanh lá **"🌱 Đúng mùa vụ"**. Nhấn tab **"Đang vào mùa"** để thấy ngay 2 món đặc sản này.
4. **Kịch bản B (Mùa nóng giải nhiệt)**: Chọn **Tháng 4** $\rightarrow$ Món *Kem dừa* hiện badge xanh lá **"🌱 Đúng mùa vụ"**, trong khi *Lẩu cá linh* chuyển thành badge vàng **"🌾 Món theo mùa"**.

### 3.2. Hướng dẫn thử nghiệm Mâm cơm gia đình (T28)
1. Nhấn nút **"Mâm Cơm Gia Đình"** trên thanh Menu hoặc Banner.
2. Modal mâm đồng tròn Nam Bộ xuất hiện với âu cơm trắng dẻo ở tâm và 4 món (Mặn, Canh, Rau, Tráng miệng).
3. Bấm đổi số người: `[2 người]`, `[4 người]`, `[6 người]`, `[8 người]` $\rightarrow$ Tổng tiền và khẩu phần cập nhật tức thì.
4. Bấm loại trừ dị ứng: Nhấn chọn `Tôm / Tép` hoặc `Cá các loại` $\rightarrow$ Mâm cơm tự động loại bỏ các món chứa hải sản và thay bằng món thịt/rau an toàn.
5. Bấm icon xoay **"Đổi"** tại món Canh $\rightarrow$ Chỉ riêng món Canh đổi sang món khác, 3 món còn lại giữ nguyên.
6. Nhấn nút **"Thêm Cả Mâm Vào Giỏ"** $\rightarrow$ Giỏ hàng tự động mở ra với đủ 4 món ăn.

### 3.3. Hướng dẫn thử nghiệm Hóa đơn điện tử & Tra cứu (Phase 4)
1. Thêm món vào giỏ $\rightarrow$ Nhấn **"Thanh Toán"**.
2. Tích chọn **"Xuất hóa đơn điện tử cho doanh nghiệp"**.
3. Nhập Tên công ty, Địa chỉ và Mã số thuế: `0100109106` (Tập đoàn Viettel - hợp lệ Modulo 11).
4. Hoàn tất đặt đơn $\rightarrow$ Hệ thống tự động cấp số hóa đơn.
5. Mở trang Tra cứu hóa đơn `http://localhost:5000/tra-cuu-hoa-don.html` $\rightarrow$ Nhập Mã đơn và 4 số cuối SĐT để xem hóa đơn GTGT điện tử có watermark DEMO và in thử A4 / K80.
