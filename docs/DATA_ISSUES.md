# DATA_ISSUES — Vị Nhà Mình

> Sinh tự động bởi `npm run seed:menu` lúc 12:18:59 9/11/2026.
> Đây là các vấn đề dữ liệu cần nhóm xử lý thủ công.

## Tóm tắt
- Thêm mới: **120** món
- Cập nhật: **0** món
- Nháp (thiếu giá): **0** món
- Bỏ qua: **0** dòng
- Lỗi: **0**

## Danh sách vấn đề

| Dòng CSV | Mức | Nội dung |
|----------|-----|---------|
| — | ✅ | Không có vấn đề nào. |

## Việc cần nhóm làm

1. Bổ sung ảnh thật cho các món thiếu ảnh vào `client/public/images/menu/<tên-file>.jpg`
2. Xác nhận tên và mô tả các món nháp trước khi mở bán (đặt `is_available=1` trong DB hoặc admin panel)
3. Kiểm tra các cảnh báo dị ứng (⚠️ WARN) — đặc biệt các món mang mắm/hải sản
4. `Lẩu thát lát cá bóp` (dòng 66) và `Gỏi gà đồi` (dòng 10) — chỉ có tên, cần bổ sung toàn bộ thông tin
5. `Hủ tiếu Mỹ Tho` (dòng 57) — thiếu tên trong CSV, đã suy đoán từ tên file ảnh
6. `Lẩu cá Lăng` (dòng 62) — thiếu mô tả và ảnh; dị ứng ghi "Hải sản (tôm)" nghi sai (cá lăng ≠ tôm)
