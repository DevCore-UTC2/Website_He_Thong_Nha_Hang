# DÀN Ý BÁO CÁO ĐỒ ÁN MÔN WEB DESIGN — NHÀ HÀNG "VỊ NHÀ MÌNH"
## Đề tài: Xây dựng Website Nhà Hàng Ẩm Thực Miền Tây & Nam Bộ "Vị Nhà Mình"
### Mục tiêu điểm số: Điểm A (≥ 9.0 / 10.0) theo Rubric đánh giá

---

## PHẦN 1: GIỚI THIỆU & ĐẶT VẤN ĐỀ (Trọng số 10%)
1.1. **Bối cảnh thực tế**:
- Sự phát triển của văn hóa ẩm thực Nam Bộ và nhu cầu số hóa dịch vụ F&B tại Việt Nam.
- Thực trạng trải nghiệm người dùng tại các nhà hàng truyền thống (thiếu thông tin dị ứng, chưa hỗ trợ mâm cơm gia đình, quy trình hóa đơn thủ công).
1.2. **Mục tiêu của đề tài**:
- Xây dựng website hiện đại, đậm đà bản sắc sông nước miền Tây ("Vị Nhà Mình").
- Ứng dụng quy chuẩn pháp lý và kế toán Việt Nam: Bóc tách VAT 2 mức (8% và 10%) theo Nghị định 72/2024/NĐ-CP, hóa đơn điện tử Nghị định 123/2020/NĐ-CP, bảo vệ dữ liệu người dùng Nghị định 13/2023/NĐ-CP.
- Trải nghiệm người dùng tinh tế: Gợi ý mâm cơm tròn 4 món gia đình, huy hiệu món theo mùa, tiếp cận toàn diện (WCAG 2.1 AA).
1.3. **Đối tượng và phạm vi ứng dụng**:
- Khách hàng cá nhân, gia đình, công ty đặt tiệc; Quản trị viên nhà hàng và bộ phận bếp.

---

## PHẦN 2: THIẾT KẾ TRẢI NGHIỆM NGƯỜI DÙNG & GIAO DIỆN (UI/UX) (Trọng số 25%)
2.1. **Hệ thống Design Tokens & Bản sắc thương hiệu**:
- Bảng màu ấm áp Nam Bộ: Gạch đất nung (`#B5472A`), xanh lá chuối non (`#3F6B3A`), vàng nghệ miệt vườn (`#E3A72F`).
- Typography: Phối hợp *Playfair Display* (tiêu đề sang trọng) và *Be Vietnam Pro* (thân bài hiển thị tiếng Việt hoàn hảo).
- Hệ thống 30+ SVG icon tự thiết kế thay thế toàn bộ emoji.
2.2. **Thiết kế Responsive 6 Breakpoints (T26)**:
- Chuẩn hóa layout tại: `360px`, `390px`, `768px`, `1024px`, `1280px`, `1536px`.
- Cơ chế chống cuộn ngang (`overflow-x: hidden`).
- Chuyển đổi linh hoạt: Modal desktop $\rightarrow$ Bottom Sheet trên Mobile (≤ 640px) có thanh kéo pull-handle.
- Đáp ứng chuẩn chạm di động: Tap target tối thiểu 44×44px (WCAG 2.5.5 / 2.5.8).
- Font ô nhập liệu ≥ 16px chống tự động zoom trên iOS Safari.
2.3. **Quy chuẩn Chuyển động & Animation (T27)**:
- Tuân thủ 10 tiêu chuẩn chuyển động: Chỉ animate `transform` và `opacity` (GPU accelerated).
- Tuyệt đối không dùng `transition: all` hay `scale(0)`.
- Hỗ trợ `@media (prefers-reduced-motion: reduce)` và `@media (hover: hover)`.

---

## PHẦN 3: KIẾN TRÚC KỸ THUẬT & CƠ SỞ DỮ LIỆU (Trọng số 25%)
3.1. **Kiến trúc phân tầng (Clean Architecture)**:
- **Frontend**: Vanilla JavaScript (ES Modules hiện đại), không phụ thuộc framework cồng kềnh, tối ưu hiệu năng tải trang.
- **Backend**: Node.js & Express 5 (RESTful APIs + Socket.IO real-time).
- **Database**: SQLite3 với hệ thống quản lý migration có phiên bản (`server/migrations/001..005`).
3.2. **Mô hình Dữ liệu Quan hệ**:
- Bảng `dishes` mở rộng: `vat_category`, `age_restricted`, `preorder_hours`, `season_months`, `serves`.
- Bảng `allergens` & `dish_allergens`: Liên kết nhiều - nhiều quản lý 14 nhóm dị ứng chuẩn.
- Bảng `users` mở rộng: SĐT quốc tế E.164 (Unique Index), lưu vết đồng ý điều khoản bảo mật NĐ 13.
- Bảng `orders` & `order_items`: Bóc tách doanh thu chưa thuế, tiền thuế VAT 8% và 10%.
- Bảng `invoices`: Snapshot bất biến hóa đơn, cấp số tuần tự an toàn trong transaction.
3.3. **Bảo mật & Tối ưu hóa**:
- Tích hợp `helmet` (Content Security Policy, anti-clickjacking), `compression` (Gzip/Brotli).
- Giới hạn tần suất gọi API với `express-rate-limit` (chống DDoS và Brute-force đăng nhập).
- Kiểm tra tính hợp lệ Mã số thuế (MST) theo thuật toán Modulo 11.

---

## PHẦN 4: CÁC TÍNH NĂNG ĐẶC SẮC & SÁNG TẠO (Trọng số 25%)
4.1. **Tính năng "Mâm Cơm Gia Đình Nam Bộ" (T28)**:
- Tùy chọn khẩu phần 2, 4, 6, 8 người ăn.
- Thuật toán tất định gợi ý mâm tròn đủ 4 vị: Mặn · Canh · Rau/Xào · Tráng miệng.
- Bộ lọc loại trừ dị ứng nghiêm ngặt 2 chiều.
- Trực quan hóa bằng SVG mâm đồng tròn tương tác, đổi món từng vị trí, nút "Thêm cả mâm vào giỏ".
4.2. **Tính năng "Đặc Sản Đang Vào Mùa" (T29)**:
- Tự động nhận diện tháng hệ thống (`Asia/Ho_Chi_Minh`) và cột `season_months`.
- Huy hiệu động: `🌱 Đúng mùa vụ` hoặc `🌾 Món theo mùa`.
- Bộ chọn mô phỏng tháng (Test Month Switcher) phục vụ kiểm thử và trải nghiệm khách hàng.
4.3. **Hệ thống VAT 2 mức & Hóa đơn điện tử (NĐ 123/2020)**:
- Bóc tách thuế từ giá niêm yết đã gồm VAT (`PRICE_INCLUDES_VAT=true`).
- Thuật toán phân bổ giảm giá phần dư lớn nhất (Largest Remainder Method) khớp từng đồng.
- Cấp số hóa đơn tuần tự (8 chữ số), bản thể hiện in A4 & K80 có watermark DEMO.
- Cổng tra cứu hóa đơn trực tuyến cho khách hàng doanh nghiệp.

---

## PHẦN 5: KIỂM THỬ, ĐÁNH GIÁ & TIẾP CẬN (A11Y) (Trọng số 15%)
5.1. **Tiếp cận toàn diện (WCAG 2.1 AA — T30)**:
- Skip link cho Screen Readers và người dùng bàn phím.
- Outline focus-visible tương phản cao.
- Thứ bậc Heading chuẩn không nhảy cóc.
- Toast notification hỗ trợ `aria-live="polite"`.
5.2. **Kết quả kiểm thử tự động (Test Automation)**:
- Toàn bộ 47+ unit tests pass 100% bằng bộ chạy chuẩn `node --test`.
- Linter nội bộ `npm run lint` quét 85+ file sạch lỗi và cảnh báo.
- Quy trình đóng gói production bằng `npm run build` sinh bundle JS/CSS có hash.
5.3. **Đánh giá kết quả & Hướng phát triển**:
- Đối chiếu toàn diện với Rubric chấm điểm đồ án.
- Các giới hạn kỹ thuật được ghi nhận minh bạch tại `docs/LIMITATIONS.md`.
