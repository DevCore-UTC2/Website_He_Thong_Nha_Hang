## 7. CẤU HÌNH TAILWIND CSS CHUẨN CHO RESPONSIVE & LANDSCAPE

Khi sử dụng Tailwind CSS, cấu hình mặc định không có sẵn breakpoint cho màn hình xoay ngang (Landscape). Hãy yêu cầu AI thiết lập file `tailwind.config.js` theo chuẩn dưới đây để bổ sung modifier `landscape:` và tinh chỉnh các biến thể co giãn:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html,mdx}",
  ],
  theme: {
    extend: {
      // 1. Định nghĩa các Breakpoint chuẩn từ Mobile đến màn hình cực lớn
      screens: {
        'xs': '375px',     // Smartphone cỡ trung (iPhone, Samsung Galaxy)
        'sm': '640px',     // Smartphone lớn / Máy tính bảng dọc
        'md': '768px',     // Máy tính bảng tiêu chuẩn
        'lg': '1024px',    // Laptop nhỏ / Máy tính bảng màn hình lớn
        'xl': '1280px',    // Laptop/Desktop tiêu chuẩn
        '2xl': '1536px',   // Màn hình Desktop lớn
        '3xl': '1920px',   // Màn hình Full HD lớn / 2K
        '4xl': '2560px',   // Màn hình 4K siêu rộng
        
        // 2. Breakpoint đặc biệt khóa riêng cho chế độ XOAY NGANG của Mobile
        'mobile-landscape': { 
          'raw': '(max-width: 932px) and (orientation: landscape)' 
        },
      },
      // 3. Tối ưu hóa chiều cao động để tránh lỗi thanh địa chỉ trình duyệt trên Mobile (100vh bug)
      height: {
        'screen-dynamic': '100dvh',
      },
      minHeight: {
        'screen-dynamic': '100dvh',
      }
    },
  },
  plugins: [],
}
```

### HƯỚNG DẪN AI CÁCH SỬ DỤNG CLASS TRONG CODE THỰC TẾ

Khi viết code HTML/JSX, AI phải áp dụng linh hoạt các class được tối ưu từ cấu hình trên:

*   **Sử dụng `mobile-landscape:` để sửa lỗi khi xoay ngang:**
    ```html
    <!-- Mặc định đứng xếp 1 cột. Khi xoay ngang chia thành 2 cột để không bị che nội dung -->
    <div class="grid grid-cols-1 mobile-landscape:grid-cols-2 lg:grid-cols-3 gap-6">
      <div>Hình ảnh sản phẩm</div>
      <div>Thông tin & Nút bấm mua hàng</div>
    </div>
    ```
*   **Xử lý chiều cao Banner khi xoay ngang:**
    ```html
    <!-- Màn hình đứng chiếm hết 100dvh, nhưng xoay ngang thì đổi thành auto để nội dung không bị tràn bóp nghẹt -->
    <section class="h-screen-dynamic mobile-landscape:h-auto py-12">
       <h1>Chào mừng bạn</h1>
    </section>
    ```
*   **Giới hạn khung hiển thị cho Desktop (Tránh bị bạt mạng sang 2 bên mép):**
    ```html
    <!-- Đảm bảo ôm trọn 100% trên mobile nhưng không quá 1440px trên màn hình lớn và luôn căn giữa -->
    <main class="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
       <!-- Nội dung trang web -->
    </main>
    ```
