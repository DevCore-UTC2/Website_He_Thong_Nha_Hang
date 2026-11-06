/**
 * SERVER VALIDATORS (Phần A4)
 * Kiểm tra dữ liệu đầu vào phía Server đồng nhất với Client
 */

function isValidPhone(phone, optional = false) {
  if (!phone || !String(phone).trim()) {
    return Boolean(optional);
  }
  const regex = /^(0|\+?84)(3|5|7|8|9)\d{8}$/;
  return regex.test(String(phone).trim());
}

function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  const regex = /^[\p{L}\s'.-]+$/u;
  return regex.test(trimmed);
}

module.exports = {
  isValidPhone,
  isValidName
};
