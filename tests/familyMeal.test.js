/**
 * UNIT TEST: THUẬT TOÁN MÂM CƠM GIA ĐÌNH NAM BỘ (T28)
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MEAL_GROUPS,
  VALID_SERVES,
  classifyDishGroup,
  hasAllergens,
  getServesInfo,
  suggestFamilyMeal,
  rotateDishAtPosition
} = require('../shared/familyMealAlgorithm.js');

// Dữ liệu mẫu mô phỏng thực đơn nhà hàng miền Tây
const MOCK_DISHES = [
  // Món Mặn
  { id: 101, name: 'Cá lóc kho tộ miền Tây', price: 140000, allergens: 'fish', category_slug: 'mon-chinh', is_available: 1 },
  { id: 102, name: 'Thịt kho hột vịt nước dừa', price: 150000, allergens: 'eggs', category_slug: 'mon-chinh', is_available: 1 },
  { id: 103, name: 'Tôm rim ba chỉ cháy cạnh', price: 165000, allergens: 'shrimp', category_slug: 'mon-chinh', is_available: 1 },
  { id: 104, name: 'Sườn non ram mặn ngọt', price: 135000, allergens: null, category_slug: 'mon-chinh', is_available: 1 },

  // Món Canh
  { id: 201, name: 'Canh chua cá linh bông điên điển', price: 160000, allergens: 'fish', category_slug: 'mon-nuoc', is_available: 1 },
  { id: 202, name: 'Canh khổ qua dồn thịt bằm', price: 95000, allergens: null, category_slug: 'mon-nuoc', is_available: 1 },
  { id: 203, name: 'Canh chua tôm sú bông so đũa', price: 150000, allergens: 'shrimp', category_slug: 'mon-nuoc', is_available: 1 },
  { id: 204, name: 'Lẩu cá kèo lá giang', price: 280000, allergens: 'fish', category_slug: 'mon-nuoc', is_available: 1 },

  // Món Xào / Rau / Gỏi
  { id: 301, name: 'Rau luộc thập cẩm kho quẹt', price: 85000, allergens: 'shrimp-paste', category_slug: 'khai-vi', is_available: 1 },
  { id: 302, name: 'Rau muống xào tỏi giòn rụm', price: 65000, allergens: null, category_slug: 'khai-vi', is_available: 1 },
  { id: 303, name: 'Gỏi ngó sen tôm thịt', price: 125000, allergens: 'shrimp,peanuts', category_slug: 'khai-vi', is_available: 1 },
  { id: 304, name: 'Bông bí xào tép đồng', price: 95000, allergens: 'shrimp', category_slug: 'khai-vi', is_available: 1 },

  // Món Tráng Miệng
  { id: 401, name: 'Chè bà ba Nam Bộ', price: 35000, allergens: 'coconut', category_slug: 'trang-mieng', is_available: 1 },
  { id: 402, name: 'Chè bưởi An Giang giòn ngọt', price: 35000, allergens: 'coconut', category_slug: 'trang-mieng', is_available: 1 },
  { id: 403, name: 'Bánh da lợn lá dứa cốt dừa', price: 30000, allergens: 'coconut', category_slug: 'trang-mieng', is_available: 1 },
  { id: 404, name: 'Đĩa trái cây tươi miệt vườn', price: 60000, allergens: null, category_slug: 'trang-mieng', is_available: 1 },

  // Đồ uống (Cần bị loại khỏi mâm cơm 4 món)
  { id: 501, name: 'Rượu đế Gò Đen', price: 150000, allergens: null, vat_category: 'alcohol', is_available: 1 },
  { id: 502, name: 'Trà đá đường phèn', price: 15000, allergens: null, category_slug: 'thuc-uong', is_available: 1 },

  // Món hết hàng (is_available = 0)
  { id: 601, name: 'Cá rô kho tộ hết hàng', price: 110000, allergens: 'fish', category_slug: 'mon-chinh', is_available: 0 }
];

test('Phân loại nhóm món ăn chuẩn mâm cơm miền Tây', () => {
  assert.equal(classifyDishGroup({ name: 'Cá lóc kho tộ', category_slug: 'mon-chinh' }), 'man');
  assert.equal(classifyDishGroup({ name: 'Canh chua cá lóc', category_slug: 'mon-nuoc' }), 'canh');
  assert.equal(classifyDishGroup({ name: 'Rau muống xào tỏi', category_slug: 'khai-vi' }), 'xao_rau');
  assert.equal(classifyDishGroup({ name: 'Chè bà ba', category_slug: 'trang-mieng' }), 'trang_mieng');
  assert.equal(classifyDishGroup({ name: 'Rượu Gò Đen', vat_category: 'alcohol' }), 'beverage');
  // Bánh canh là món canh/nước, không phải bánh ngọt tráng miệng
  assert.equal(classifyDishGroup({ name: 'Bánh canh cá lóc', category_slug: 'mon-nuoc' }), 'canh');
});

test('Kiểm tra nhận diện dị ứng chính xác (slug và từ khóa tiếng Việt)', () => {
  const dishTôm = { name: 'Gỏi ngó sen tôm thịt', allergens: 'shrimp,peanuts' };
  const dishChay = { name: 'Rau muống xào tỏi', allergens: null };

  assert.equal(hasAllergens(dishTôm, ['shrimp']), true);
  assert.equal(hasAllergens(dishTôm, ['tôm']), true);
  assert.equal(hasAllergens(dishTôm, ['peanuts']), true);
  assert.equal(hasAllergens(dishTôm, ['đậu phộng']), true);
  assert.equal(hasAllergens(dishTôm, ['eggs']), false);
  assert.equal(hasAllergens(dishChay, ['shrimp', 'peanuts']), false);
});

test('Gợi ý mâm cơm trả về đủ 4 món thuộc 4 nhóm phân biệt', () => {
  const meal = suggestFamilyMeal({ dishes: MOCK_DISHES, serves: 4, seed: 1 });

  assert.ok(meal.items.man, 'Phải có món mặn');
  assert.ok(meal.items.canh, 'Phải có món canh');
  assert.ok(meal.items.xao_rau, 'Phải có món xào/rau');
  assert.ok(meal.items.trang_mieng, 'Phải có món tráng miệng');

  assert.equal(classifyDishGroup(meal.items.man), 'man');
  assert.equal(classifyDishGroup(meal.items.canh), 'canh');
  assert.equal(classifyDishGroup(meal.items.xao_rau), 'xao_rau');
  assert.equal(classifyDishGroup(meal.items.trang_mieng), 'trang_mieng');

  // Không bao gồm đồ uống hay món hết hàng
  assert.notEqual(meal.items.man.id, 501);
  assert.notEqual(meal.items.man.id, 601);
});

test('Tính tất định (Deterministic): cùng seed cho ra cùng một mâm cơm', () => {
  const meal1 = suggestFamilyMeal({ dishes: MOCK_DISHES, serves: 4, seed: 42 });
  const meal2 = suggestFamilyMeal({ dishes: MOCK_DISHES, serves: 4, seed: 42 });

  assert.equal(meal1.items.man.id, meal2.items.man.id);
  assert.equal(meal1.items.canh.id, meal2.items.canh.id);
  assert.equal(meal1.items.xao_rau.id, meal2.items.xao_rau.id);
  assert.equal(meal1.items.trang_mieng.id, meal2.items.trang_mieng.id);
  assert.equal(meal1.totalPrice, meal2.totalPrice);
});

test('Lọc bỏ thành công các món chứa dị ứng chỉ định', () => {
  // Lọc dị ứng: tôm (shrimp) và cá (fish)
  const meal = suggestFamilyMeal({
    dishes: MOCK_DISHES,
    serves: 4,
    excludeAllergens: ['shrimp', 'fish'],
    seed: 0
  });

  // Món mặn không được là cá lóc hay tôm rim
  assert.notEqual(meal.items.man.id, 101); // Cá lóc
  assert.notEqual(meal.items.man.id, 103); // Tôm rim

  // Món canh không được là cá linh hay tôm sú hay cá kèo
  assert.equal(meal.items.canh.id, 202); // Canh khổ qua dồn thịt (an toàn)

  // Món rau không được là gỏi ngó sen tôm hay bông bí tép
  assert.notEqual(meal.items.xao_rau.id, 303);
  assert.notEqual(meal.items.xao_rau.id, 304);
});

test('Tính năng "Đổi món" từng vị trí giữ nguyên 3 món còn lại', () => {
  const initialMeal = suggestFamilyMeal({ dishes: MOCK_DISHES, serves: 4, seed: 10 });
  const originalMan = initialMeal.items.man.id;
  const originalCanh = initialMeal.items.canh.id;
  const originalXao = initialMeal.items.xao_rau.id;
  const originalTrangMieng = initialMeal.items.trang_mieng.id;

  // Đổi món ở vị trí CANH (direction = 1)
  const rotatedMeal = rotateDishAtPosition(initialMeal, 'canh', 1, MOCK_DISHES);

  // Món canh phải thay đổi
  assert.notEqual(rotatedMeal.items.canh.id, originalCanh);

  // 3 món còn lại phải GIỮ NGUYÊN 100%
  assert.equal(rotatedMeal.items.man.id, originalMan);
  assert.equal(rotatedMeal.items.xao_rau.id, originalXao);
  assert.equal(rotatedMeal.items.trang_mieng.id, originalTrangMieng);
});

test('Tính toán số người ăn (2, 4, 6, 8) và tổng tiền mâm cơm', () => {
  const meal4 = suggestFamilyMeal({ dishes: MOCK_DISHES, serves: 4, seed: 5 });
  const meal8 = suggestFamilyMeal({ dishes: MOCK_DISHES, serves: 8, seed: 5 });

  // Khẩu phần 8 người gấp đôi khẩu phần 4 người
  assert.equal(meal8.totalPrice, meal4.totalPrice * 2);
  assert.equal(meal4.serves, 4);
  assert.equal(meal8.serves, 8);

  const serves2 = getServesInfo(2);
  assert.equal(serves2.multiplier, 1);

  const serves6 = getServesInfo(6);
  assert.equal(serves6.multiplier, 1.5);
});
