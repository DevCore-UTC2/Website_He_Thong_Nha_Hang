# 🌾 Vị Nhà Mình — Hệ Thống Đặt Món & Quản Trị Nhà Hàng Nam Bộ

> **Đồ án Chuyên ngành Công nghệ Thông tin (Web Design & Development)**  
> **Định hướng đánh giá**: Đạt điểm Giỏi xuất sắc (**≥ 9.0 / 10**) theo Rubric đồ án chuyên nghiệp.  
> **Kiến trúc công nghệ**: Express 5 (Node.js ESM) + SQLite3 + Vanilla JS ES Modules (Native Web Components) + Socket.IO.

---

## 📖 1. GIỚI THIỆU TỔNG QUAN

**"Vị Nhà Mình"** là giải pháp chuyển đổi số toàn diện cho chuỗi ẩm thực miền Tây và Nam Bộ. Dự án kết hợp tinh hoa văn hóa ẩm thực truyền thống (bữa cơm sum họp gia đình, mùa nước nổi, sản vật đồng bằng) với các chuẩn mực công nghệ Web hiện đại, đáp ứng nghiêm ngặt các quy định pháp luật về thương mại điện tử, bảo vệ dữ liệu cá nhân và kế toán thuế tại Việt Nam.

### 🌟 Các Điểm Nhấn Bản Sắc & Công Nghệ
1. **Bản sắc văn hóa Nam Bộ**:
   - Hệ thống Design Tokens với bảng màu ấm cúng: Đất phù sa nung (`#B5472A`), Lá chuối non (`#3F6B3A`), Vàng nghệ chín (`#E3A72F`).
   - Tính năng độc quyền **"Mâm cơm gia đình"**: Gợi ý mâm cơm tròn 4 món chuẩn vị (Mặn, Canh, Xào/Rau, Tráng miệng) với giao diện mâm đồng SVG, cho phép đổi món và lọc dị ứng linh hoạt.
   - Tính năng **"Đang vào mùa"**: Tự động nhận diện và gắn huy hiệu mùa vụ nông sản (Cá linh, Bông điên điển, Bông súng...) theo tháng thời gian thực kèm công cụ mô phỏng tháng kiểm thử.
2. **Kế toán & Hóa đơn điện tử (Nghị định 123/2020/NĐ-CP & Nghị định 72/2024/NĐ-CP)**:
   - Cơ chế bóc tách thuế GTGT hai mức thuế suất: **8%** đối với thức ăn & nước giải khát, **10%** đối với đồ uống có cồn.
   - Giá niêm yết đã bao gồm thuế (`PRICE_INCLUDES_VAT=true`), giải thuật phân bổ giảm giá theo tỷ lệ và làm tròn phần dư lớn nhất.
   - Kê khai xuất HĐĐT doanh nghiệp với thuật toán kiểm tra Mã số thuế (MST) Modulo 11.
   - Cấp số hóa đơn tuần tự chống trùng lặp trong SQLite transaction.
   - Bản thể hiện HĐĐT chuẩn in A4 & K80, watermark bảo vệ pháp lý *"HÓA ĐƠN DEMO – KHÔNG CÓ GIÁ TRỊ PHÁP LÝ"*, QR tra cứu trực tuyến và thuật toán đọc số tiền thành chữ tiếng Việt không dùng thư viện ngoài.
3. **Tiếp cận Web & Trải nghiệm người dùng (A11y & UI/UX)**:
   - Đạt chuẩn tiếp cận **WCAG 2.1 AA**: Skip link bỏ qua nội dung, viền `:focus-visible` tương phản cao, cây tiêu đề Heading tuần tự không nhảy bậc, đầy đủ ARIA roles.
   - Chuẩn hóa Responsive trên 6 dải màn hình (360px, 390px, 768px, 1024px, 1280px, 1536px), hoàn toàn không scroll ngang, Modal tự động chuyển thành Bottom Sheet trên di động, Tap target tối thiểu 44x44px.
   - Chuyển động Animation theo 10 nguyên tắc tối ưu GPU, hỗ trợ `prefers-reduced-motion`.
4. **Bảo mật & Hiệu năng**:
   - Xác thực đa kênh: Đăng nhập bằng Email hoặc Số điện thoại chuẩn quốc tế E.164.
   - Bảo mật nhiều tầng: `helmet` CSP, `compression` Gzip, `express-rate-limit` chống brute-force, tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
   - Để đảm bảo an toàn khi triển khai thật, cần đặt biến môi trường `JWT_SECRET` với chuỗi ngẫu nhiên dài tối thiểu 32 ký tự thay vì dùng giá trị mặc định.
   - Build pipeline tích hợp minification CSS/JS, băm mã hash MD5 chống cache và tự động tạo `manifest.json`.

---

## 🚀 2. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### Yêu cầu môi trường
* **Node.js**: Phiên bản 18.x trở lên (khuyến nghị Node.js 20 LTS).
* **Trình duyệt**: Hỗ trợ chuẩn ECMAScript Modules (Chrome, Edge, Firefox, Safari hiện đại).

### Các bước cài đặt và vận hành
```bash
# 1. Di chuyển vào thư mục dự án
cd Web_nha_hang_test

# 2. Cài đặt các phụ thuộc
npm install

# 3. Khởi tạo / đặt lại cơ sở dữ liệu mẫu ban đầu
npm run reset-db

# 4. Khởi chạy máy chủ (Mặc định cổng 5000)
npm start
# (Hoặc npm run dev để tự động reload khi chỉnh sửa file backend)

# 5. Mở trình duyệt web và truy cập
http://localhost:5000
```

### Các lệnh npm hữu ích khác
| Lệnh terminal | Mục đích thực hiện |
| :--- | :--- |
| `npm test` | Chạy toàn bộ **47 unit tests** kiểm tra chất lượng tự động |
| `npm run lint` | Quét kiểm tra cú pháp và chất lượng mã nguồn trên **85 files JS** |
| `npm run build` | Đóng gói, minify CSS/JS và tạo thư mục `client/dist/` cho Production |
| `npm run seed:menu` | Nhập dữ liệu 97 món ăn Nam Bộ từ file `server/seeds/menu.csv` |
| `npm run reset-db` | Đặt lại cơ sở dữ liệu về trạng thái mẫu ban đầu |

> **Lưu ý hiệu suất:** Chạy `npm run build` để đóng gói bản tối ưu (minify, bundle) trước khi đo hiệu suất Lighthouse.

---

## 🔑 3. TÀI KHOẢN TRẢI NGHIỆM VÀ CHẤM ĐIỂM NHANH

Hệ thống có sẵn tính năng **"⚡ Demo nhanh 1-Click"** tại hộp thoại Đăng nhập giúp Thầy Cô và Hội đồng trải nghiệm ngay lập tức:

| Phân hệ / Vai trò | Email đăng nhập | Số điện thoại E.164 | Mật khẩu | Quyền hạn và Chức năng kiểm thử |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@vinhaminh.vn` | `+84901234567` | `Admin@1234` | Toàn quyền: Bếp KDS, Sơ đồ bàn ăn, Quản trị thực đơn, Cảnh báo kho tồn, Dashboard doanh thu bóc tách VAT 8%/10%, Cảnh báo 60 ngày hết hạn giảm thuế. |
| **Nhân viên (Staff)** | `staff@vinhaminh.vn` | `+84907654321` | `Staff@1234` | Màn hình Bếp KDS Realtime (Socket.IO), Sơ đồ bàn ăn, Cập nhật trạng thái chế biến món ăn. |
| **Khách hàng (Customer)** | `khach@vinhaminh.vn` | `+84912345678` | `Khach@1234` | Đặt món, Tùy chọn Mâm cơm gia đình, Lọc món mùa vụ, Áp mã voucher, Thanh toán thuế VAT 2 mức, Xuất HĐĐT, Đặt bàn, Tích điểm thành viên. |

---

## 🗂️ 4. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
Web_nha_hang_test/
├── client/                      # Giao diện phía người dùng (Frontend)
│   ├── index.html               # Trang chủ Semantic HTML5 (Chuẩn WCAG 2.1 AA)
│   ├── hoa-don.html             # Bản thể hiện Hóa đơn điện tử (In A4/K80 + Watermark)
│   ├── tra-cuu-hoa-don.html     # Cổng tra cứu HĐĐT theo Mã tra cứu & Mã đơn
│   ├── chinh-sach-bao-mat.html  # Điều khoản & Chính sách bảo mật (NĐ 13/2023)
│   ├── 404.html                 # Trang báo lỗi 404 thân thiện
│   ├── src/
│   │   ├── components/          # Icons SVG, Navbar, Footer, AuthModal, Toast
│   │   ├── pages/customer/      # Menu, CartDrawer, CheckoutModal, FamilyMeal...
│   │   ├── pages/admin/         # AdminDashboard, MenuManager, TableManager...
│   │   ├── styles/              # tokens.css, base.css, utilities.css, responsive.css
│   │   └── utils/               # Client validators, helpers, formatters
│   └── dist/                    # Thư mục xuất bản Production sau khi build
├── server/                      # Máy chủ dịch vụ (Backend Express 5)
│   ├── app.js                   # Điểm khởi tạo Express, Middleware, Helmet, Routes
│   ├── config/                  # Cấu hình CSDL SQLite, Thuế (tax.js), Thông tin nhà hàng
│   ├── controllers/             # Điều khiển Auth, Menu, Order, Invoice, Dashboard
│   ├── migrations/              # 5 file migration SQL có quản lý phiên bản
│   ├── routes/                  # Định tuyến RESTful API
│   ├── seeds/                   # Kịch bản nạp dữ liệu món ăn Nam Bộ (menu.csv)
│   └── services/                # InvoiceService (SQLite transaction), E-invoice adapters
├── shared/                      # Module dùng chung giữa Node.js ESM và Browser ESM
│   ├── validators.js            # Kiểm tra Email, SĐT E.164, MST Modulo 11
│   ├── currencyToWords.js       # Thuật toán đọc số tiền thành chữ tiếng Việt
│   ├── familyMealAlgorithm.js   # Thuật toán gợi ý mâm cơm 4 món & Lọc dị ứng
│   └── seasonHelper.js          # Nhận diện nông sản vào mùa theo tháng
├── scripts/                     # Kịch bản tự động hóa
│   ├── build.js                 # Minify CSS/JS, băm hash MD5 và tạo manifest
│   └── lint.js                  # Linter runner quét cú pháp và chuẩn mã nguồn
├── tests/                       # Bộ kiểm thử tự động (47 Unit tests)
│   ├── a11y.test.js             # Kiểm tra WCAG 2.1 AA, Skip link, Heading hierarchy
│   ├── browserMatrix.test.js    # Kiểm tra Browserslist & CSS fallback
│   ├── build.test.js            # Kiểm tra tính toàn vẹn của build pipeline
│   ├── currencyToWords.test.js  # Kiểm tra đọc tiền tệ tiếng Việt
│   ├── familyMeal.test.js       # Kiểm tra thuật toán mâm cơm gia đình
│   ├── lint.test.js             # Kiểm tra chất lượng mã nguồn
│   ├── motion.test.js           # Kiểm tra 10 tiêu chuẩn Animation GPU
│   ├── responsive.test.js       # Kiểm tra không tràn màn hình tại 6 breakpoint
│   ├── season.test.js           # Kiểm tra logic mùa vụ thời gian thực
│   └── vatAndInvoice.test.js    # Kiểm tra phân bổ VAT 8%/10% và checksum MST
└── docs/                        # Hệ thống tài liệu kỹ thuật hoàn chỉnh
    ├── BAO_CAO_DAN_Y.md         # Dàn ý báo cáo đồ án Web Design điểm A (≥ 9.0)
    ├── TEST_REPORT.md           # Báo cáo kiểm thử chất lượng toàn diện
    ├── DEMO_SCRIPT.md           # Kịch bản thuyết trình và demo 7–10 phút
    ├── PHAN_CONG_NHOM.md        # Phân công nhiệm vụ, đóng góp thành viên & Sprint log
    ├── LIMITATIONS.md           # Minh bạch các giới hạn kỹ thuật và lộ trình mở rộng
    ├── BROWSER_MATRIX.md        # Ma trận hỗ trợ trình duyệt & CSS Fallback
    └── DATA_ISSUES.md           # Báo cáo rà soát và chuẩn hóa dữ liệu thực đơn
```

---

## 📚 5. DANH MỤC TÀI LIỆU CHI TIẾT (DOCS)

Dự án cung cấp bộ tài liệu hoàn chỉnh phục vụ Hội đồng đánh giá và chấm điểm:
* 📄 [`docs/BAO_CAO_DAN_Y.md`](docs/BAO_CAO_DAN_Y.md): Dàn ý chi tiết 5 chương chuẩn học thuật theo Rubric đánh giá.
* 📄 [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): Báo cáo kết quả 47 test cases, kiểm tra responsive 6 breakpoint, WCAG 2.1 AA.
* 📄 [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md): Kịch bản phân vai thuyết trình và từng cú click chuột trong 10 phút.
* 📄 [`docs/PHAN_CONG_NHOM.md`](docs/PHAN_CONG_NHOM.md): Bảng phân công 4 thành viên, tỷ lệ đóng góp và nhật ký tiến độ.
* 📄 [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md): Báo cáo minh bạch các giới hạn công nghệ và lộ trình thương mại hóa.
* 📄 [`docs/BROWSER_MATRIX.md`](docs/BROWSER_MATRIX.md): Ma trận tương thích các trình duyệt phổ biến tại Việt Nam.
* 📄 [`docs/DATA_ISSUES.md`](docs/DATA_ISSUES.md): Nhật ký xử lý và làm sạch dữ liệu 97 món ăn thực tế.

---

## ⚖️ 6. BẢN QUYỀN VÀ TUYÊN BỐ PHÁP LÝ

* Đồ án được thực hiện phục vụ mục đích học tập và nghiên cứu công nghệ Web.
* Mọi dữ liệu về doanh nghiệp phát hành hóa đơn tại `server/config/seller.js` và trên hóa đơn điện tử đều mang tính chất **MINH HỌA (DEMO)**, không có giá trị pháp lý kê khai thuế thực tế.
* Bản quyền thuộc về Nhóm sinh viên thực hiện đồ án "Vị Nhà Mình" © 2026.
