-- Migration 006: Thêm trạng thái và thời gian cập nhật cho từng món trong đơn hàng phục vụ bếp (Kitchen Display)
-- Luồng trạng thái: received (Chưa nấu) -> cooking (Đang nấu) -> ready (Đã nấu xong) -> serving (Phục vụ ra bàn / Chờ phục vụ) -> completed (Hoàn tất)

ALTER TABLE order_items ADD COLUMN item_status TEXT DEFAULT 'received';
ALTER TABLE order_items ADD COLUMN status_updated_at DATETIME;

-- Khởi tạo thời gian cập nhật và item_status cho các món hiện có theo trạng thái đơn hàng
UPDATE order_items SET status_updated_at = CURRENT_TIMESTAMP WHERE status_updated_at IS NULL;

UPDATE order_items 
SET item_status = (
  SELECT CASE 
    WHEN o.status = 'cancelled' THEN 'cancelled'
    WHEN o.status = 'completed' THEN 'completed'
    WHEN o.status = 'serving' THEN 'serving'
    WHEN o.status = 'ready' THEN 'ready'
    WHEN o.status = 'cooking' THEN 'cooking'
    ELSE 'received'
  END
  FROM orders o 
  WHERE o.id = order_items.order_id
);
