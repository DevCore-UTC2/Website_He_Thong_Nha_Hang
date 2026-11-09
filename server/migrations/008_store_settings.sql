-- Migration 008: Bảng cài đặt hệ thống & Trạng thái hoạt động nhà hàng (Store Status)
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

INSERT OR IGNORE INTO store_settings (key, value, updated_by)
VALUES ('store_status_mode', 'auto', 'system');
