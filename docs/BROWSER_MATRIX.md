# MA TRẬN TƯƠNG THÍCH TRÌNH DUYỆT (BROWSER MATRIX) — VỊ NHÀ MÌNH

> Cập nhật lúc: 03/11/2026 — Đề tài: Website nhà hàng ẩm thực miền Tây "Vị Nhà Mình"  
> Phạm vi cấu hình: `browserslist` trong `package.json`

---

## 1. Cấu hình Browserslist

Dự án áp dụng cấu hình Browserslist tiêu chuẩn hiện đại, bao quát thị phần người dùng Internet tại Việt Nam (đặc biệt là di động iOS Safari, Chrome Android, Cốc Cốc):

```json
"browserslist": [
  "> 0.5%",
  "last 2 versions",
  "Firefox ESR",
  "not dead",
  "not IE 11",
  "Safari >= 14",
  "iOS >= 14",
  "Chrome >= 90",
  "Edge >= 90"
]
```

---

## 2. Bảng ma trận hỗ trợ trình duyệt

| Trình duyệt | Nền tảng | Phiên bản tối thiểu | Mức độ hỗ trợ | Cơ chế Fallback / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Google Chrome** | Desktop (Windows/macOS) & Android | Chrome 90+ | **Hỗ trợ đầy đủ (100%)** | Hỗ trợ Native ES Modules, Backdrop-filter, DVH, CSS Grid/Flexbox |
| **Apple Safari** | macOS | Safari 14+ | **Hỗ trợ đầy đủ** | Bổ sung `-webkit-backdrop-filter`, xử lý scroll bounce |
| **Apple Safari iOS** | iPhone / iPad | iOS Safari 14+ | **Hỗ trợ đầy đủ** | Tap target ≥ 44×44px, Font size ô nhập liệu ≥ 16px chống auto-zoom, Modal chuyển thành Bottom Sheet |
| **Mozilla Firefox** | Windows, macOS, Linux, Android | Firefox 90+ & ESR | **Hỗ trợ đầy đủ** | Hỗ trợ CSS Color tokens, standard transitions |
| **Microsoft Edge** | Windows / macOS | Edge 90+ | **Hỗ trợ đầy đủ** | Tương thích Chromium core |
| **Cốc Cốc** | Windows / Android / iOS | Phiên bản 85+ | **Hỗ trợ đầy đủ** | Tương thích Chromium core, hiển thị tiếng Việt hoàn hảo |
| **Samsung Internet** | Thiết bị di động Samsung | Phiên bản 15+ | **Hỗ trợ đầy đủ** | Hỗ trợ Touch events và Viewport meta tags |

---

## 3. Các cơ chế CSS Fallback & Progressive Enhancement đã triển khai

1. **Hiệu ứng làm mờ nền (Backdrop Filter)**:
   - Thuộc tính chuẩn: `backdrop-filter: blur(4px);`
   - Vendor prefix cho Apple WebKit: `-webkit-backdrop-filter: blur(4px);`
   - Graceful Degradation: Bổ sung `@supports not (backdrop-filter: blur(4px))` tự động chuyển sang màu nền bán trong suốt `rgba(15, 23, 42, 0.88)` để đảm bảo khả năng đọc văn bản trên trình duyệt cũ.

2. **Chiều cao Viewport di động (Dynamic Viewport Units - `dvh`)**:
   - Sử dụng `height: 100vh; height: 100dvh;` và `max-height: 90vh; max-height: 90dvh;`
   - Trên trình duyệt cũ: Áp dụng `vh`.
   - Trên trình duyệt hiện đại (iOS Safari 15.4+, Chrome 108+): Tự động áp dụng `dvh` chống tình trạng thanh địa chỉ Safari che khuất nút thao tác đáy.

3. **Motion & Giảm chuyển động (Prefers Reduced Motion)**:
   - `@media (prefers-reduced-motion: reduce)`: Giảm duration xuống `0.01ms` để bảo vệ người dùng nhạy cảm tiền đình.
   - `@media (hover: hover) and (pointer: fine)`: Chỉ kích hoạt hiệu ứng nâng thẻ `translateY(-2px)` khi người dùng dùng chuột, chống dính trạng thái hover trên màn hình cảm ứng điện thoại.

4. **Trạng thái Focus bàn phím**:
   - Áp dụng `:focus-visible` thay vì `:focus` thông thường để người dùng chuột không bị khó chịu bởi viền focus, trong khi người dùng bàn phím (phím Tab) luôn thấy viền xanh tương phản cao rõ ràng.

---

## 4. Tuyên bố trung thực về mức độ kiểm thử (Disclaimer)

> ⚠️ **LƯU Ý VỀ MỨC ĐỘ KIỂM THỬ**:  
> Bảng ma trận tương thích này được xây dựng dựa trên thông số kỹ thuật chính thức từ **CanIUse**, **MDN Web Docs** và việc triển khai đầy đủ các cơ chế **CSS Vendor Prefixes / Graceful Degradation Fallbacks** trong mã nguồn.  
> 
> Trong khuôn khổ đồ án học tập, nhóm phát triển **chưa tiến hành kiểm thử vật lý đồng thời trên tất cả các tổ hợp thiết bị phần cứng thật** (ví dụ: máy tính bảng iPad đời cũ, một số dòng Android giá rẻ, máy tính Linux phân phối đặc thù). Nhóm khuyến nghị người dùng trải nghiệm tốt nhất trên Google Chrome, Apple Safari hoặc Microsoft Edge các phiên bản 2 năm gần nhất.
