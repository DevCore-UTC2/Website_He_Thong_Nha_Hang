/**
 * CẤU HÌNH NHÀ HÀNG — VỊ NHÀ MÌNH
 * Đọc từ .env khi có; mặc định hợp lý cho dev/demo.
 * Muốn thay đổi: sửa .env, không sửa file này.
 */

module.exports = {
  // ——— Giờ mở / đóng cửa (Asia/Ho_Chi_Minh) ———
  OPEN_HOUR:  parseInt(process.env.OPEN_HOUR  || '9',  10), // 09:00
  CLOSE_HOUR: parseInt(process.env.CLOSE_HOUR || '22', 10), // 22:00

  // Đặt bàn muộn nhất trước giờ đóng cửa 1 tiếng
  LAST_RESERVATION_HOUR: parseInt(process.env.LAST_RESERVATION_HOUR || '21', 10),

  TIMEZONE: 'Asia/Ho_Chi_Minh',

  // ——— Tên & thương hiệu ———
  DISPLAY_NAME:  process.env.RESTAURANT_DISPLAY_NAME  || 'Vị Nhà Mình',
  TAGLINE:       process.env.RESTAURANT_TAGLINE        || 'Ẩm thực miền Tây & Nam Bộ',

  // ——— Địa chỉ ———
  ADDRESS: process.env.RESTAURANT_ADDRESS ||
    '450 Lê Văn Việt, Phường Tăng Nhơn Phú, TP. Thủ Đức, TP. Hồ Chí Minh',

  // ——— Giỏ hàng & đơn hàng ———
  MAX_ITEMS_PER_ORDER: 50,
  MIN_ORDER_AMOUNT:    0,   // đồng

  // ——— Điểm thành viên ———
  POINTS_PER_10K: parseInt(process.env.POINTS_PER_10K || '1', 10), // 1 điểm / 10.000đ
};
