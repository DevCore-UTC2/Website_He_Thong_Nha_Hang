-- Migration 002: Mở rộng bảng dishes + allergens
-- Áp dụng: 03/11/2026
-- Thêm: vat_category, age_restricted, preorder_hours, season_months,
--        origin_provinces, serves, slug (nếu chưa), bảng allergens

-- Thêm cột vat_category (food=8% đến 31/12/2026, alcohol=10%)
ALTER TABLE dishes ADD COLUMN vat_category TEXT NOT NULL DEFAULT 'food'
  CHECK(vat_category IN ('food','alcohol','beverage','service'));

-- Thêm cột age_restricted (1 = chỉ phục vụ 18+)
ALTER TABLE dishes ADD COLUMN age_restricted INTEGER NOT NULL DEFAULT 0;

-- Thêm cột preorder_hours (đặt trước X giờ, 0 = không cần)
ALTER TABLE dishes ADD COLUMN preorder_hours INTEGER NOT NULL DEFAULT 0;

-- Thêm cột season_months (JSON array tháng, null = cả năm)
ALTER TABLE dishes ADD COLUMN season_months TEXT;

-- Thêm cột origin_provinces (JSON array tỉnh/vùng xuất xứ)
ALTER TABLE dishes ADD COLUMN origin_provinces TEXT;

-- Thêm cột serves (số người phục vụ tiêu chuẩn)
ALTER TABLE dishes ADD COLUMN serves INTEGER NOT NULL DEFAULT 1;

-- Bảng dị ứng (allergens)
CREATE TABLE IF NOT EXISTS allergens (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- Bảng liên kết dish ↔ allergen (many-to-many)
CREATE TABLE IF NOT EXISTS dish_allergens (
  dish_id     INTEGER NOT NULL,
  allergen_id INTEGER NOT NULL,
  PRIMARY KEY (dish_id, allergen_id),
  FOREIGN KEY (dish_id)     REFERENCES dishes(id)    ON DELETE CASCADE,
  FOREIGN KEY (allergen_id) REFERENCES allergens(id) ON DELETE CASCADE
);

-- Seed danh sách allergens chuẩn (14 nhóm phổ biến ở Việt Nam)
INSERT OR IGNORE INTO allergens (name, slug) VALUES
  ('Gluten (lúa mì, lúa mạch)',  'gluten'),
  ('Hải sản (giáp xác)',         'crustaceans'),
  ('Hải sản (nhuyễn thể)',       'molluscs'),
  ('Hải sản (tôm)',              'shrimp'),
  ('Hải sản (cua)',              'crab'),
  ('Cá',                        'fish'),
  ('Trứng',                     'eggs'),
  ('Sữa',                       'milk'),
  ('Đậu phộng',                 'peanuts'),
  ('Đậu nành',                  'soy'),
  ('Dừa',                       'coconut'),
  ('Đậu xanh',                  'mungbean'),
  ('Hải sản (tép/mắm)',         'shrimp-paste'),
  ('Khác',                      'other');

-- Index hỗ trợ tìm kiếm theo vat_category và age_restricted
CREATE INDEX IF NOT EXISTS idx_dishes_vat_cat ON dishes(vat_category);
CREATE INDEX IF NOT EXISTS idx_dishes_age     ON dishes(age_restricted);
