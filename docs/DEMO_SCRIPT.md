# KỊCH BẢN THUYẾT TRÌNH VÀ DEMO ĐỒ ÁN (DEMO SCRIPT)
## HỆ THỐNG WEBSITE NHÀ HÀNG ẨM THỰC NAM BỘ "VỊ NHÀ MÌNH"

> **Thời lượng chuẩn**: 7 – 10 phút  
> **Mục tiêu**: Làm nổi bật tính bản địa văn hóa Nam Bộ kết hợp chuẩn mực kỹ thuật công nghệ cao (Express 5, SQLite, Vanilla JS ESM, VAT hai mức theo NĐ 123/2020, A11y WCAG 2.1 AA, Responsive 6 breakpoint).  
> **Đội ngũ đề xuất**: 3 – 4 thành viên (hoặc 1 diễn giả + 1 demo kỹ thuật).

---

## ⏱️ PHÂN BỔ THỜI LƯỢNG VÀ KỊCH BẢN TỔNG QUAN

| Mốc thời gian | Phân hệ & Nội dung | Người phụ trách | Thao tác trên giao diện |
| :--- | :--- | :--- | :--- |
| **00:00 – 01:15** | Đặt vấn đề, thương hiệu & Design System | Thành viên 1 (Lead) | Trang chủ, chuyển Theme Dark/Light, co giãn màn hình Responsive |
| **01:15 – 03:00** | Trải nghiệm khách hàng: Mâm cơm gia đình SVG & Món mùa vụ | Thành viên 2 (Frontend) | Chọn khẩu phần 4 người, đổi món mâm đồng, lọc dị ứng, bật thanh thử tháng mùa nước nổi |
| **03:00 – 05:15** | Giỏ hàng, Thuế VAT 2 mức & Xuất Hóa đơn điện tử | Thành viên 3 (Backend) | Đặt món có cồn (10%) + thức ăn (8%), nhập MST Modulo 11, thanh toán và xem Hóa đơn demo |
| **05:15 – 07:15** | Quản trị vận hành: Bếp KDS Realtime & Dashboard Doanh thu VAT | Thành viên 1 / 4 | Đăng nhập Admin, xác nhận đơn trên KDS, xem bảng phân bổ VAT và xuất báo cáo CSV |
| **07:15 – 08:30** | Đảm bảo chất lượng: A11y, Unit Test Suite & Build Production | Thành viên 4 (DevOps/QA) | Thao tác bàn phím Tab/Skip link, chạy `npm test`, `npm run lint`, `npm run build` |
| **08:30 – 10:00** | Tổng kết, bài học kinh nghiệm & Trả lời câu hỏi (Q&A) | Cả nhóm | Slide / Tài liệu tóm tắt, giải đáp thắc mắc của Hội đồng |

---

## 🎬 KỊCH BẢN CHI TIẾT TỪNG PHÚT

### 📍 Phút 00:00 – 01:15: Mở đầu & Nhận diện thương hiệu Nam Bộ
* **Lời thoại**:
  > *"Kính thưa quý Thầy Cô trong Hội đồng chấm đồ án, nhóm chúng em xin trân trọng giới thiệu dự án website nhà hàng **'Vị Nhà Mình'** — một giải pháp chuyển đổi số toàn diện mang đậm bản sắc văn hóa ẩm thực miền Tây và Nam Bộ. Khác với các website thương mại đại trà, 'Vị Nhà Mình' được xây dựng trên triết lý lấy trải nghiệm sum họp gia đình làm trung tâm, tuân thủ nghiêm ngặt chuẩn mực công nghệ Web hiện đại và các quy định pháp lý kế toán tại Việt Nam."*
* **Thao tác Demo**:
  1. Mở trang chủ `http://localhost:5000`.
  2. Giới thiệu logo SVG nón lá - mái nhà ấm cúng, bộ màu Design Tokens: Đất nung (`#B5472A`), Lá chuối non (`#3F6B3A`), Vàng nghệ (`#E3A72F`).
  3. Bấm icon Chuyển đổi Dark Mode / Light Mode để thấy độ tương phản đạt chuẩn.
  4. Mở DevTools (`F12`), giả lập thiết bị iPhone 14 (390px) và iPad (768px): Giao diện mượt mà, hoàn toàn không có thanh cuộn ngang, modal tự động chuyển thành Bottom Sheet vuốt chạm tiện lợi.

---

### 📍 Phút 01:15 – 03:00: Tính năng bản sắc — "Mâm cơm gia đình" & "Đang vào mùa"
* **Lời thoại**:
  > *"Điểm nhấn văn hóa độc đáo nhất của 'Vị Nhà Mình' chính là tính năng **'Mâm cơm gia đình'**. Người Nam Bộ xem bữa cơm gia đình là sợi dây gắn kết yêu thương. Thuật toán của chúng em sẽ tự động gợi ý một mâm cơm cân bằng dinh dưỡng 4 món chuẩn vị: 1 món Mặn đậm đà, 1 món Canh thanh mát, 1 món Xào/Rau tươi giòn, và 1 món Tráng miệng dân dã."*
* **Thao tác Demo**:
  1. Cuộn đến banner "Mâm cơm gia đình", bấm nút **"Khám phá mâm cơm chuẩn vị"**.
  2. Bố cục SVG mâm đồng Nam Bộ mở ra: Trung tâm là thố cơm trắng, 4 góc là 4 món ăn bày trên đĩa viền men lam cổ điển.
  3. Chọn số người ăn: Chuyển từ **2 người** sang **4 người** $\rightarrow$ Định lượng và giá tiền tự động tính toán tức thì.
  4. Thử bộ lọc dị ứng: Tích chọn "Dị ứng Đậu phộng / Hải sản" $\rightarrow$ Thuật toán ngay lập tức thay thế món vi phạm bằng món an toàn phù hợp.
  5. Thử nút **"Đổi món"** tại vị trí món Mặn (ví dụ đổi Cá kho tộ sang Thịt kho hột vịt) $\rightarrow$ Thể hiện sự linh hoạt tối đa.
  6. Bấm **"Thêm cả mâm vào giỏ hàng"** $\rightarrow$ Toast thông báo xuất hiện, giỏ hàng cập nhật đủ 4 món.
  7. Lướt qua khu vực thực đơn: Trỏ vào huy hiệu **"Đang vào mùa"** (như Cá linh, Bông điên điển vào mùa nước nổi). Bật thanh mô phỏng tháng (Test Month Switcher) sang tháng 10 để thấy hệ thống tự động nhận diện mùa vụ theo thời gian thực.

---

### 📍 Phút 03:00 – 05:15: Thanh toán, Phân bổ VAT 2 mức & Hóa đơn điện tử NĐ 123
* **Lời thoại**:
  > *"Về mặt nghiệp vụ kế toán, nhà hàng chúng em giải quyết triệt để bài toán **thuế GTGT hai mức thuế suất** theo Nghị định 123/2020 và chính sách giảm thuế của Quốc hội: 8% đối với đồ ăn nước giải khát, và 10% đối với đồ uống có cồn. Giá niêm yết đã bao gồm VAT để bảo vệ quyền lợi khách hàng, hệ thống bóc tách thuế bằng thuật toán phân bổ tỷ lệ và làm tròn phần dư lớn nhất."*
* **Thao tác Demo**:
  1. Bấm mở Giỏ hàng (Cart Drawer) $\rightarrow$ Đã có món ăn thường (thuế 8%) và thêm 1 chai Rượu đế Gò Đen (thuế 10%, có gắn cờ 18+).
  2. Bấm **"Tiến hành đặt món"** $\rightarrow$ Modal thanh toán mở ra.
  3. Xem bảng bóc tách:
     - Tổng tiền chưa thuế.
     - Tiền thuế VAT 8% (thức ăn).
     - Tiền thuế VAT 10% (rượu).
     - Tổng thanh toán cuối cùng.
  4. Bật tùy chọn **"Xuất hóa đơn điện tử cho doanh nghiệp"**:
     - Nhập MST thử nghiệm sai định dạng $\rightarrow$ Hệ thống báo lỗi ngay nhờ thuật toán checksum Modulo 11.
     - Nhập MST hợp lệ (ví dụ: `0312345678`) $\rightarrow$ Hợp lệ.
  5. Bấm **"Xác nhận đặt đơn"** $\rightarrow$ Đơn hàng tạo thành công.
  6. Bấm nút **"Xem Hóa đơn điện tử"** $\rightarrow$ Trang `hoa-don.html` hiển thị:
     - Số hóa đơn cấp tự động tuần tự trong SQLite transaction.
     - Bảng phân bổ thuế 8% và 10% rõ ràng.
     - Dòng chữ đọc số tiền bằng chữ tiếng Việt chuẩn xác (thuật toán không dùng thư viện ngoài).
     - Watermark chéo **"HÓA ĐƠN DEMO – KHÔNG CÓ GIÁ TRỊ PHÁP LÝ"** tuân thủ pháp luật.
     - Bấm thử nút **"In hóa đơn"** $\rightarrow$ Xem giao diện `@media print` A4 chuẩn chỉnh.

---

### 📍 Phút 05:15 – 07:15: Vận hành Bếp KDS Realtime & Báo cáo Quản trị
* **Lời thoại**:
  > *"Để nhà hàng vận hành trơn tru từ sảnh ăn đến khu bếp, chúng em tích hợp hệ thống Bếp thời gian thực (KDS) sử dụng WebSockets và phân hệ quản trị trực quan cho chủ nhà hàng."*
* **Thao tác Demo**:
  1. Mở tab trình duyệt thứ 2, đăng nhập tài khoản Quản trị (`admin@vinhaminh.vn`).
  2. Vào màn hình **Bếp (KDS)**: Đơn hàng vừa đặt lập tức xuất hiện ở cột "Chờ chế biến" không cần F5 tải lại trang.
  3. Kéo chuyển đơn sang "Đang nấu" và "Hoàn tất" $\rightarrow$ Bên màn hình khách hàng cập nhật tức thì.
  4. Chuyển sang tab **"Báo cáo & Thống kê"**:
     - Xem biểu đồ doanh thu bóc tách riêng doanh thu chưa thuế, tiền thuế 8% và 10%.
     - Banner cảnh báo thời hạn chính sách giảm thuế VAT 8% (đến hết 31/12/2026).
     - Bấm nút **"Xuất báo cáo CSV"** $\rightarrow$ Tải file dữ liệu tài chính phục vụ khai báo thuế.

---

### 📍 Phút 07:15 – 08:30: Tiêu chuẩn kỹ thuật, A11y & Kiểm thử tự động
* **Lời thoại**:
  > *"Toàn bộ mã nguồn dự án được thiết kế theo kiến trúc phi framework (Vanilla JS ES Modules) giúp tải cực nhanh, không phụ thuộc nặng nề vào các thư viện bên ngoài. Chúng em đảm bảo chuẩn tiếp cận Web A11y WCAG 2.1 AA và quy trình kiểm thử tự động toàn diện."*
* **Thao tác Demo**:
  1. Trình diễn tiếp cận người khuyết tật (A11y):
     - Dùng phím `Tab`: Xuất hiện nút **"Bỏ qua tới nội dung chính (Skip to content)"** $\rightarrow$ Bấm `Enter` nhảy thẳng vào thực đơn.
     - Di chuyển phím Tab qua các nút bấm: Viền `:focus-visible` tương phản cao nổi bật.
  2. Mở Terminal chạy kiểm thử tự động:
     - Chạy `npm test`: **47/47 unit tests PASS 100%** (bao gồm test đọc số tiền, thuật toán mâm cơm, phân bổ VAT, kiểm tra 6 breakpoint responsive, motion 10 tiêu chuẩn).
     - Chạy `npm run lint`: **Quét sạch 85 files JS, 0 lỗi, 0 cảnh báo**.
     - Chạy `npm run build`: Tự động biên dịch, minify và sinh bundle có hash MD5 cho môi trường Production.

---

### 📍 Phút 08:30 – 10:00: Tổng kết & Trả lời câu hỏi (Q&A)
* **Tóm tắt 3 thế mạnh cốt lõi**:
  1. **Tính bản địa sâu sắc**: Tái hiện trọn vẹn phong vị ẩm thực Nam Bộ qua thiết kế và tính năng "Mâm cơm gia đình", "Món theo mùa".
  2. **Nghiệp vụ thực tế**: Xử lý triệt để bài toán hóa đơn VAT 2 mức theo chuẩn pháp luật Việt Nam.
  3. **Chất lượng công nghệ**: Codebase sạch sẽ, responsive hoàn hảo, a11y đầy đủ, kiểm thử bao phủ toàn diện.
* **Sẵn sàng nhận câu hỏi phản biện từ Hội đồng**.

---

## 💡 CÁC CÂU HỎI THƯỜNG GẶP TỪ HỘI ĐỒNG & CÁCH TRẢ LỜI

| Câu hỏi của Giám khảo | Hướng trả lời thuyết phục |
| :--- | :--- |
| *Tại sao không dùng React hay Vue mà lại chọn Vanilla JS ES Modules?* | Dự án hướng tới sự thấu hiểu sâu sắc nền tảng Web Core (DOM APIs, Web Standards, CSS Variables). Vanilla JS ESM giúp trang tải gần như tức thì (< 100ms), không có gánh nặng bundle size của framework, đồng thời thể hiện kỹ năng tổ chức module hóa sạch sẽ của nhóm. |
| *Thuật toán mâm cơm gia đình có bị trùng lặp hoặc thiếu món không?* | Thuật toán được thiết kế mang tính tất định (deterministic), phân loại món theo 4 nhóm dinh dưỡng và hỗ trợ lọc loại trừ dị ứng. Nếu thiếu món, thuật toán tự động áp dụng cơ chế fallback thông minh để luôn đảm bảo đủ cấu trúc mâm cơm 4 món. |
| *Hệ thống đã kết nối trực tiếp với cổng Tổng cục Thuế chưa?* | Hiện tại hệ thống triển khai theo mô hình Adapter Pattern với nhà cung cấp DEMO, tuân thủ đúng cấu trúc dữ liệu theo Nghị định 123/2020/NĐ-CP và có gắn watermark rõ ràng. Khi triển khai thật, nhóm chỉ cần cấu hình khóa API của Viettel/VNPT mà không cần sửa đổi logic nghiệp vụ lõi. |
| *Làm sao để đảm bảo an toàn dữ liệu trên thiết bị di động?* | Giao diện đã được kiểm tra trên 6 dải màn hình, form AuthModal có cơ chế chống mất dữ liệu khi vô tình chạm backdrop, mật khẩu được mã hóa bcrypt và kiểm tra độ mạnh realtime, dữ liệu nháp nhạy cảm được bảo mật trong Session Storage. |
