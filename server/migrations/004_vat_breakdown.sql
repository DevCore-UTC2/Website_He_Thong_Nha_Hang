-- Migration 004: Bóc tách thuế VAT hai mức (8% và 10%) và phân bổ giảm giá
-- Áp dụng: 03/11/2026
-- Phục vụ quy định giá niêm yết đã bao gồm VAT và hóa đơn điện tử NĐ 123/2020

-- 1. Mở rộng bảng order_items
ALTER TABLE order_items ADD COLUMN vat_category TEXT DEFAULT 'food';
ALTER TABLE order_items ADD COLUMN vat_rate REAL DEFAULT 0.08;
ALTER TABLE order_items ADD COLUMN discount_allocated REAL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN amount_before_vat REAL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN vat_amount REAL DEFAULT 0;

-- 2. Mở rộng bảng orders
ALTER TABLE orders ADD COLUMN total_before_vat REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN vat_8_amount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN vat_10_amount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN is_legacy_tax INTEGER DEFAULT 0;

-- 3. Đánh dấu các đơn hàng cũ trước migration là đơn legacy
UPDATE orders SET is_legacy_tax = 1 WHERE is_legacy_tax = 0;

-- Khôi phục giá trị tạm thời cho các đơn cũ
UPDATE orders 
SET total_before_vat = MAX(0, total_amount - vat_amount),
    vat_8_amount = vat_amount,
    vat_10_amount = 0
WHERE is_legacy_tax = 1;

UPDATE order_items
SET vat_category = 'food',
    vat_rate = 0.08,
    amount_before_vat = ROUND(item_total / 1.08),
    vat_amount = item_total - ROUND(item_total / 1.08)
WHERE amount_before_vat = 0;
