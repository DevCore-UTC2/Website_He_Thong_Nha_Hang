/**
 * CHECK AND MAINTAIN DATABASE INTEGRITY — VỊ NHÀ MÌNH
 */
const { dbAsync } = require('../config/db');

async function checkAndAddDishes() {
  console.log('=== KIỂM TRA TOÀN DIỆN CƠ SỞ DỮ LIỆU ===');
  
  // 1. Kiểm tra tính toàn vẹn (Integrity check)
  const integrity = await dbAsync.all('PRAGMA integrity_check');
  console.log('1. Kết quả kiểm tra toàn vẹn CSDL:', integrity[0]?.integrity_check || 'OK');

  // 2. Kiểm tra ràng buộc khóa ngoại (Foreign Key Check)
  const fkErrors = await dbAsync.all('PRAGMA foreign_key_check');
  if (fkErrors.length === 0) {
    console.log('2. Khóa ngoại (Foreign Keys): Hoàn hảo, không có lỗi mồ côi dữ liệu.');
  } else {
    console.warn('⚠️ Cảnh báo lỗi khóa ngoại:', fkErrors);
  }

  // 3. Đếm số món đang phục vụ
  const activeDishes = await dbAsync.get('SELECT COUNT(*) as cnt FROM dishes WHERE is_available = 1');
  console.log(`3. Số món đang phục vụ: ${activeDishes.cnt} món (chuẩn ẩm thực miền Tây/Nam Bộ).`);
  console.log('=== HOÀN TẤT KIỂM TRA ===');
}

if (require.main === module) {
  checkAndAddDishes()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { checkAndAddDishes };
