/**
 * UNIT TEST: TÍNH NĂNG "ĐANG VÀO MÙA" (T29)
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseSeasonMonths,
  getCurrentSeasonMonth,
  isDishInSeason,
  getSeasonInfo,
  filterSeasonalDishes
} = require('../shared/seasonHelper.js');

const SAMPLE_DISHES = [
  { id: 1, name: 'Lẩu cá linh bông điên điển', season_months: '[8,9,10,11]' },
  { id: 2, name: 'Điên điển xào tép', season_months: '[8,9,10,11]' },
  { id: 3, name: 'Kem dừa Bến Tre', season_months: '[3,4,5,6]' },
  { id: 4, name: 'Cá lóc kho tộ', season_months: null },
  { id: 5, name: 'Bánh da lợn lá dứa', season_months: '[]' }
];

test('Parse chuỗi season_months an toàn và chính xác', () => {
  assert.deepEqual(parseSeasonMonths('[8,9,10,11]'), [8, 9, 10, 11]);
  assert.deepEqual(parseSeasonMonths([3, 4, 5]), [3, 4, 5]);
  assert.deepEqual(parseSeasonMonths(null), []);
  assert.deepEqual(parseSeasonMonths(''), []);
  assert.deepEqual(parseSeasonMonths('invalid-json'), []);
});

test('Kiểm tra món đang vào mùa đúng theo từng tháng', () => {
  const lauCaLinh = SAMPLE_DISHES[0];
  const kemDua = SAMPLE_DISHES[2];
  const caLoc = SAMPLE_DISHES[3];

  // Tháng 11 (Mùa nước nổi rộ)
  assert.equal(isDishInSeason(lauCaLinh, 11), true);
  assert.equal(isDishInSeason(kemDua, 11), false);
  assert.equal(isDishInSeason(caLoc, 11), false);

  // Tháng 4 (Mùa nóng giải nhiệt)
  assert.equal(isDishInSeason(lauCaLinh, 4), false);
  assert.equal(isDishInSeason(kemDua, 4), true);

  // Tháng 8 (Đầu mùa nước nổi)
  assert.equal(isDishInSeason(lauCaLinh, 8), true);

  // Tháng 1 (Ngoài mùa)
  assert.equal(isDishInSeason(lauCaLinh, 1), false);
});

test('Lọc danh sách món ăn đang vào mùa', () => {
  // Lọc vào tháng 10: phải có Lẩu cá linh và Điên điển xào tép
  const octDishes = filterSeasonalDishes(SAMPLE_DISHES, 10, true);
  assert.equal(octDishes.length, 2);
  assert.deepEqual(octDishes.map(d => d.id), [1, 2]);

  // Lọc vào tháng 5: chỉ có Kem dừa
  const mayDishes = filterSeasonalDishes(SAMPLE_DISHES, 5, true);
  assert.equal(mayDishes.length, 1);
  assert.equal(mayDishes[0].id, 3);

  // Không lọc mùa (onlyInSeason = false)
  const allDishes = filterSeasonalDishes(SAMPLE_DISHES, 10, false);
  assert.equal(allDishes.length, 5);
});

test('Thông tin mùa văn hóa ẩm thực miền Nam', () => {
  const seasonOct = getSeasonInfo(10);
  assert.equal(seasonOct.month, 10);
  assert.equal(seasonOct.name, 'Mùa nước nổi miền Tây');
  assert.equal(seasonOct.isFloodSeason, true);

  const seasonApril = getSeasonInfo(4);
  assert.equal(seasonApril.month, 4);
  assert.equal(seasonApril.isFloodSeason, false);
});

test('Hỗ trợ ghi đè tháng để kiểm thử (Test month override)', () => {
  // Tháng truyền trực tiếp
  assert.equal(getCurrentSeasonMonth(8), 8);
  assert.equal(getCurrentSeasonMonth(12), 12);

  // Nếu truyền tháng ngoài phạm vi 1-12 thì tự fallback về tháng hiện tại hợp lệ
  const defaultMonth = getCurrentSeasonMonth();
  assert.ok(defaultMonth >= 1 && defaultMonth <= 12);
  assert.equal(getCurrentSeasonMonth(99), defaultMonth);
});
