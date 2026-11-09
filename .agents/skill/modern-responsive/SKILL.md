---
name: modern-responsive-design
description: Hướng dẫn thiết kế giao diện web hiện đại, thích ứng hoàn hảo (Fluid/Responsive) từ Mobile (Dọc & Ngang), Tablet đến Ultra-wide Desktop (2K/4K). Tuyệt đối không vỡ layout, không tràn ngang, không che nội dung.
---

# HƯỚNG DẪN THIẾT KẾ GIAO DIỆN HIỆN ĐẠI & THÍCH ỨNG TOÀN DIỆN

## 1. NGUYÊN TẮC CỐT LÕI (BẮT BUỘC)
*   **Mobile-First Approach:** Luôn viết style mặc định cho thiết bị di động (màn hình dọc nhỏ nhất ~320px), sau đó dùng `media queries` hoặc `breakpoint modifiers` (như `md:`, `lg:`) để mở rộng cho màn hình lớn hơn.
*   **Tuyệt Đối Không Fix Cứng Kích Thước (No Hardcoded Pixels):** Cấm sử dụng đơn vị cố định `px` cho chiều rộng (`width`) và chiều cao (`height`) của các khối layout lớn. Bắt buộc dùng đơn vị tỷ lệ linh hoạt như `%`, `vw`, `vh`, `fr` kết hợp với các giới hạn an toàn (`max-width`, `min-width`) để co giãn mượt mà.
*   **Chống Tràn Ngang (`overflow-x`):** Đảm bảo trang web tuyệt đối không xuất hiện thanh cuộn ngang của toàn trang trên bất kỳ thiết bị nào. Khung chứa chính (Wrapper/Container) luôn phải giới hạn `max-width: 100%` hoặc `w-full`.
*   **Phòng Ngừa Bị Che Khuất (Safe Areas):** Thiết kế khoảng đệm (`padding/margin`) an toàn cho các thiết bị có "tai thỏ", "nốt ruồi" (màn hình smartphone đời mới) sử dụng thuộc tính `env(safe-area-inset-*)`.

## 2. XỬ LÝ ĐẶC BIỆT CHO THIẾT BỊ XOAY NGANG (LANDSCAPE MODE)
Khi điện thoại hoặc máy tính bảng xoay ngang, chiều cao (`height`) bị thu hẹp lại rất nhiều trong khi chiều rộng (`width`) tăng lên (thường từ 480px đến 932px). Để giao diện không bị vỡ hoặc che khuất:

*   **Sử Dụng Media Query Hướng Màn Hình:** Khi cần tinh chỉnh riêng cho chế độ xoay ngang, bắt buộc dùng điều kiện `orientation: landscape`:
    ```css
    @media (max-width: 932px) and (orientation: landscape) {
      /* Code tối ưu riêng cho điện thoại xoay ngang */
    }
    ```
*   **Giảm Chiều Cao Các Khối Lớn (Hero Banner / Header):** Không dùng `height: 100vh` cho các banner lớn khi xoay ngang vì nó sẽ đẩy toàn bộ nội dung quan trọng xuống dưới vùng nhìn thấy. Thay vào đó, dùng `min-height: auto` hoặc giảm chiều cao xuống.
*   **Chuyển Đổi Bố Cục (Flex/Grid) Linh Hoạt:** Các thành phần xếp dọc trên màn hình đứng (như ảnh phía trên, chữ phía dưới) phải tự động chuyển sang xếp ngang (ảnh bên trái, chữ bên phải) khi xoay ngang để tận dụng chiều rộng màn hình.
*   **Ẩn/Thu Gọn Các Khoảng Trống (Spacing):** Giảm `padding` và `margin` của các section khi ở chế độ landscape để nội dung không bị thưa thớt và người dùng không phải cuộn trang quá nhiều.

## 3. QUY TẮC BỐ CỤC HỆ THỐNG (LAYOUT SYSTEMS)

### Flexbox & Grid Linh Hoạt
*   **Flex Wrapping:** Luôn sử dụng `flex-wrap` khi xếp các phần tử theo hàng ngang để chúng tự động xuống hàng trên màn hình nhỏ hoặc khi không gian bị bóp nghẹt.
*   **Grid Auto-Fit (Khuyên dùng):** Sử dụng hệ thống lưới tự động tính toán số cột dựa trên không gian thực tế, tự động nhảy hàng khi co hẹp:
    ```css
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    ```

### Kiểm Soát Kích Thước An Toàn
*   Sử dụng công thức chặn trên/chặn dưới: `min-width`, `max-width`, `min-height`, `max-height`. 
*   **Ví dụ chuẩn:** `width: 100%; max-width: 1200px; margin: 0 auto;` (Giúp trang web full màn hình trên mobile nhưng thu gọn, căn giữa đẹp mắt trên laptop/desktop, không bị bạt mạng ra 2 mép).
*   Sử dụng hàm `clamp()` để tự động co giãn kích thước (Padding, Margin, Typography) mượt mà không cần viết quá nhiều Media Queries:
    ```css
    /* padding co giãn từ 1rem (mobile) đến 3rem (desktop) dựa trên chiều rộng màn hình */
    padding: clamp(1rem, 5vw, 3rem);
    ```

## 4. KHẮC PHỤC CÁC LỖI VỠ VÀ CHE KHUẤT PHỔ BIẾN

### Tránh Lỗi Tràn/Vỡ Do Văn Bản (Typography)
*   Sử dụng hàm `clamp()` cho chữ lớn (như Heading `<h1>`) để chữ tự nhỏ lại trên mobile, tránh việc chữ quá to đẩy vỡ khung: `font-size: clamp(1.75rem, 4vw, 3rem);`.
*   Thêm `word-break: break-word` hoặc `overflow-wrap: anywherere` cho các chuỗi văn bản dài (hoặc link URL) để tự động xuống dòng, không đẩy khung layout ra ngoài.

### Tránh Lỗi Vỡ Do Hình Ảnh & Video (Media)
*   Tất cả hình ảnh và video phải tự thích ứng trong khung chứa, không được tràn tự do:
    ```css
    img, video {
      max-width: 100%;
      height: auto;
      object-fit: cover;
    }
    ```

### Tránh Che Nội Dung Do Thanh Trình Duyệt Mobile (100vh Bug)
*   Trên iOS Safari và Android Chrome, thanh địa chỉ thường che mất phần đáy giao diện nếu dùng `height: 100vh`.
*   **Giải pháp:** Sử dụng đơn vị Dynamic Viewport `dvh` hoặc `min-h-screen` (trong Tailwind CSS đời mới) để đảm bảo layout hiển thị trọn vẹn trong vùng nhìn thấy của người dùng:
    ```css
    height: 100dvh;
    ```

### Xử Lý Bảng Biểu Và Dữ Liệu Rộng (Tables / Code Blocks)
*   Các thành phần không thể co giãn nhỏ hơn (như Table dữ liệu, sơ đồ, khối code) bắt buộc phải được bọc trong một thẻ `div` có thuộc tính `overflow-x: auto` để người dùng mobile vuốt ngang riêng khối đó, không làm ảnh hưởng đến toàn bộ trang web.

## 5. HỆ THỐNG BREAKPOINTS CHUẨN (Từ Mobile đến 4K)
Áp dụng các điểm dừng (Breakpoints) tiêu chuẩn sau để tối ưu giao diện:
*   **`< 640px` (Mobile Dọc):** Bố cục 1 cột dọc (Single column), menu ẩn vào Hamburger, nút bấm to tối thiểu 48x48px cho ngón tay.
*   **`640px` trở lên (Sm - Mobile Xoay Ngang / Tablet đứng):** Bắt đầu chia 2 cột cho danh sách, tối ưu hóa lại chiều cao của Header/Hero.
*   **`768px` trở lên (Md - Tablet đứng lớn / Tablet ngang):** Hiện thanh Menu điều hướng đầy đủ (nếu ít item), chia bố cục 2-3 cột.
*   **`1024px` trở lên (Lg - Laptop tiêu chuẩn / Tablet ngang lớn):** Bố cục hoàn chỉnh, tận dụng khoảng trắng (whitespace) để giao diện thoáng đãng.
*   **`1280px` đến `1536px+` (Xl/2Xl - Màn hình Desktop lớn / 2K / 4K):** Phải giới hạn chiều rộng tối đa của nội dung (`max-width: 1440px` hoặc `max-w-7xl`) và căn giữa trang (`mx-auto`) để nội dung không bị dạt ra quá xa hai bên mép màn hình, gây mỏi mắt khi đọc.

## 6. KIỂM TRA ĐẦU RA (SELF-CHECKLIST CHO AI)
Trước khi bàn giao mã nguồn, hãy tự chạy kiểm tra các điều sau:
1. Có phần tử nào bị gán cứng `width` bằng pixel lớn hơn `320px` không? (Nếu có, sửa thành `max-width` hoặc `%`).
2. Khi giả lập màn hình xoay ngang (ví dụ: `width: 844px`, `height: 390px`), phần nội dung chính (như form đăng nhập, nút bấm) có bị che khuất bởi Header hoặc Footer cố định (`position: fixed`) không?
3. Đã sử dụng `box-sizing: border-box` trên toàn bộ phần tử (`*`) chưa để tránh việc cộng dồn padding làm vỡ khung?
4. Thử thu hẹp màn hình xuống `320px`, nội dung có bị dính sát vào mép không? (Nếu có, thêm `padding-x`).
