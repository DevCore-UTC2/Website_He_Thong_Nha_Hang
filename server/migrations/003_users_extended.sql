-- Migration 003: Mở rộng bảng users cho xác thực nâng cao & bảo mật
-- Áp dụng: 03/11/2026
-- Thêm các trường: phone_e164, google_id, privacy_consented_at, birthdate

-- 1. Thêm cột số điện thoại chuẩn E.164 (VD: +84901234567)
ALTER TABLE users ADD COLUMN phone_e164 TEXT;

-- 2. Thêm cột Google ID phục vụ đăng nhập Single Sign-On (Google OAuth 2.0)
ALTER TABLE users ADD COLUMN google_id TEXT;

-- 3. Thêm cột thời điểm đồng ý điều khoản & chính sách bảo mật (Luật An ninh mạng & Nghị định 13/2023)
ALTER TABLE users ADD COLUMN privacy_consented_at DATETIME;

-- 4. Thêm cột ngày sinh (phục vụ ưu đãi sinh nhật & kiểm tra độ tuổi đặt món có cồn)
ALTER TABLE users ADD COLUMN birthdate DATE;

-- 5. Cập nhật email demo cũ @smartbite.vn sang @vinhaminh.vn nếu còn
UPDATE users SET email = 'admin@vinhaminh.vn' WHERE email = 'admin@smartbite.vn';
UPDATE users SET email = 'staff@vinhaminh.vn' WHERE email = 'staff@smartbite.vn';

-- 6. Chuẩn hóa số điện thoại sang E.164 (tránh trùng lặp do dữ liệu test cũ)
UPDATE users 
SET phone_e164 = '+84' || SUBSTR(phone, 2)
WHERE phone IS NOT NULL 
  AND phone LIKE '0%' 
  AND LENGTH(phone) = 10 
  AND id IN (
    SELECT MIN(id) FROM users GROUP BY phone
  );

-- Đồng ý chính sách cho các tài khoản demo có sẵn
UPDATE users
SET privacy_consented_at = CURRENT_TIMESTAMP
WHERE privacy_consented_at IS NULL;

-- 7. Tạo Unique Index cho phone_e164 (chỉ áp dụng khi giá trị không null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_e164 
ON users(phone_e164) 
WHERE phone_e164 IS NOT NULL;

-- 8. Tạo Unique Index cho google_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id 
ON users(google_id) 
WHERE google_id IS NOT NULL;
