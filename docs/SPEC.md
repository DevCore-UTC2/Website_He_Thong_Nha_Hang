# SPEC.md — Bản lưu nguyên văn prompt SPEC v2 (03/11/2026)

> File này lưu toàn bộ nội dung spec gốc. Xem file gốc trong prompt để có nội dung đầy đủ nhất.
> Phiên bản: v2 · Ngày: 03/11/2026 · Hạn nộp: 10/11/2026

## Tóm tắt các điểm cốt lõi

- **Tên sản phẩm:** Vị Nhà Mình (thay SmartBite)
- **Stack giữ nguyên:** Node.js + Express 5 + SQLite + Socket.IO + Vanilla JS ES modules
- **Hạn nộp:** 10/11/2026
- **Mô hình:** Claude Sonnet 4.6 (Thinking) → GPT-OSS 120B → Gemini 3.8 Flash High
- **6 Phase:**
  1. Nền tảng & thương hiệu (P0) — Thứ Ba 03/11
  2. Thực đơn từ Google Sheet (P0) — Thứ Tư 04/11
  3. Xác thực, SĐT duy nhất, consent (P0) — Thứ Năm 05/11
  4. VAT 8%/10% & hóa đơn DEMO (P0) — Thứ Sáu 06/11
  5. Responsive, điểm nhấn sáng tạo, a11y (P0/P1) — Thứ Bảy 07/11
  6. Lint/test, build, Lighthouse, docs (P1) — Chủ Nhật 08/11

## Quyết định đã chốt
- Giá niêm yết đã gồm VAT (PRICE_INCLUDES_VAT=true)
- SĐT chuẩn hóa E.164, bắt buộc, duy nhất trên bảng users
- Giữ vanilla JS, không thêm framework UI
- Thông tin người bán là DEMO, gắn nhãn rõ ràng
- Giờ mở cửa 09:00–22:00, đặt bàn muộn nhất 21:00
- Múi giờ: Asia/Ho_Chi_Minh

## Được phép CẮT (theo thứ tự)
1. In K80 (giữ A4)
2. Bản đồ miền Tây (giữ Mâm cơm + Đang vào mùa)
3. Rút danh sách quốc gia SĐT xuống 15 nước
4. Chế độ tối chỉ đổi màu theo token, không làm thêm
5. Hold-to-confirm, stagger, delight effects

## Không được cắt
- Sửa L1 (mất dữ liệu khi bấm ngoài modal)
- SĐT duy nhất + consent phía server
- VAT đúng ví dụ 290.000đ
- Responsive không scroll ngang
- Đổi hết "SmartBite"
- Test cơ bản chạy được
