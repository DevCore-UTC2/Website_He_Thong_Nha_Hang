# DATA_ISSUES — Vị Nhà Mình

> Sinh tự động bởi `npm run seed:menu` lúc 01:43:06 3/11/2026.
> Đây là các vấn đề dữ liệu cần nhóm xử lý thủ công.

## Tóm tắt
- Thêm mới: **87** món
- Cập nhật: **1** món
- Nháp (thiếu giá): **2** món
- Bỏ qua: **0** dòng
- Lỗi: **0**

## Danh sách vấn đề

| Dòng CSV | Mức | Nội dung |
|----------|-----|---------|
| 10 | 📝 DRAFT | "Gỏi gà đồi" — thiếu giá, đặt là nháp (is_available=0). |
| 10 | ℹ️ INFO | "Gỏi gà đồi" — thiếu mô tả. |
| 10 | ℹ️ INFO | "Gỏi gà đồi" — thiếu ảnh. |
| 57 | ⚠️ WARN | Thiếu tên món. Suy đoán từ ảnh: "Hu Tieu My Tho" (dòng CSV 57). |
| 62 | ℹ️ INFO | "Lẩu cá Lăng" — thiếu mô tả. |
| 62 | ℹ️ INFO | "Lẩu cá Lăng" — thiếu ảnh. |
| 66 | 📝 DRAFT | "Lẩu thát lát cá bóp" — thiếu giá, đặt là nháp (is_available=0). |
| 66 | ℹ️ INFO | "Lẩu thát lát cá bóp" — thiếu mô tả. |
| 66 | ℹ️ INFO | "Lẩu thát lát cá bóp" — thiếu ảnh. |

## Việc cần nhóm làm

1. Bổ sung ảnh thật cho các món thiếu ảnh vào `client/public/images/menu/<tên-file>.jpg`
2. Xác nhận tên và mô tả các món nháp trước khi mở bán (đặt `is_available=1` trong DB hoặc admin panel)
3. Kiểm tra các cảnh báo dị ứng (⚠️ WARN) — đặc biệt các món mang mắm/hải sản
4. `Lẩu thát lát cá bóp` (dòng 66) và `Gỏi gà đồi` (dòng 10) — chỉ có tên, cần bổ sung toàn bộ thông tin
5. `Hủ tiếu Mỹ Tho` (dòng 57) — thiếu tên trong CSV, đã suy đoán từ tên file ảnh
6. `Lẩu cá Lăng` (dòng 62) — thiếu mô tả và ảnh; dị ứng ghi "Hải sản (tôm)" nghi sai (cá lăng ≠ tôm)
