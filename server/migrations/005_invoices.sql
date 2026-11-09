-- Migration 005: Bảng Hóa đơn điện tử (Invoices) theo Nghị định 123/2020/NĐ-CP
-- Áp dụng: 03/11/2026
-- Bất biến, cấp số hóa đơn tuần tự không trùng không nhảy số trong transaction SQLite

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE,
  order_code TEXT NOT NULL,
  invoice_number INTEGER NOT NULL UNIQUE,
  template_code TEXT NOT NULL DEFAULT '1',
  serial_code TEXT NOT NULL DEFAULT 'C26MDM',
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Thông tin người bán snapshot
  seller_name TEXT NOT NULL,
  seller_tax_id TEXT NOT NULL,
  seller_address TEXT NOT NULL,
  seller_phone TEXT,
  seller_email TEXT,
  
  -- Thông tin người mua snapshot
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_tax_id TEXT,
  buyer_company_name TEXT,
  buyer_address TEXT,
  buyer_email TEXT,
  
  -- Tiền và thuế bóc tách
  total_before_vat REAL NOT NULL,
  vat_8_amount REAL NOT NULL,
  vat_10_amount REAL NOT NULL,
  total_vat REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  total_amount_in_words TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  
  -- Snapshot danh sách hàng hóa (JSON array các món, đơn giá chưa thuế, thuế suất, tiền thuế)
  items_snapshot TEXT NOT NULL,
  
  is_demo INTEGER DEFAULT 1,
  status TEXT DEFAULT 'issued' CHECK(status IN ('issued', 'adjusted', 'replaced', 'cancelled')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
);

-- Bổ sung trường yêu cầu xuất hóa đơn công ty trên bảng orders nếu khách yêu cầu
ALTER TABLE orders ADD COLUMN invoice_company_name TEXT;
ALTER TABLE orders ADD COLUMN invoice_tax_id TEXT;
ALTER TABLE orders ADD COLUMN invoice_address TEXT;
ALTER TABLE orders ADD COLUMN invoice_email TEXT;
ALTER TABLE orders ADD COLUMN invoice_number INTEGER;

-- Index tra cứu hóa đơn nhanh chóng
CREATE INDEX IF NOT EXISTS idx_invoices_order_code ON invoices(order_code);
CREATE INDEX IF NOT EXISTS idx_invoices_number     ON invoices(invoice_number);
