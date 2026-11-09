/**
 * THUẬT TOÁN GỢI Ý MÂM CƠM GIA ĐÌNH NAM BỘ — VỊ NHÀ MÌNH
 * 
 * Bố cục chuẩn mâm cơm tròn miền Tây:
 * 1. Món mặn (kho tộ, rim, nướng, chiên, ram...)
 * 2. Món canh (canh chua cá linh, canh khổ qua, lẩu, súp...)
 * 3. Món xào / rau / gỏi (rau luộc kho quẹt, gỏi ngó sen, rau muống xào tỏi...)
 * 4. Món tráng miệng (chè bà ba, chè bưởi, bánh da lợn, chuối nếp nướng...)
 * 
 * Tính năng:
 * - Chọn số người ăn: 2, 4, 6, 8 người.
 * - Lọc bỏ dị ứng nghiêm ngặt (hải sản, đậu phộng, trứng, sữa, gluten...).
 * - Thuật toán tất định (deterministic) dựa trên seed và offsets.
 * - Hỗ trợ đổi món độc lập từng vị trí (xoay vòng trong nhóm ứng viên).
 */

export const MEAL_GROUPS = [
  { key: 'man',         label: 'Món Mặn',        position: 'top',    desc: 'Kho tộ, rim mặn, nướng trui' },
  { key: 'canh',        label: 'Món Canh',       position: 'right',  desc: 'Canh chua thanh mát, lẩu đậm đà' },
  { key: 'xao_rau',     label: 'Món Rau / Xào',  position: 'bottom', desc: 'Rau luộc kho quẹt, gỏi thanh mát' },
  { key: 'trang_mieng', label: 'Tráng Miệng',    position: 'left',   desc: 'Chè Nam Bộ, bánh quê miệt vườn' }
];

export const VALID_SERVES = [2, 4, 6, 8];

/** Bản đồ từ khóa dị ứng đa ngữ (slug <-> tiếng Việt) */
const ALLERGEN_KEYWORDS = {
  shrimp:        ['tôm', 'tép', 'shrimp', 'prawn'],
  crab:          ['cua', 'ghẹ', 'crab'],
  crustaceans:   ['giáp xác', 'tôm', 'cua', 'crustaceans'],
  molluscs:      ['nhuyễn thể', 'ốc', 'sò', 'nghêu', 'mực', 'bạch tuộc', 'molluscs'],
  fish:          ['cá', 'thác lác', 'fish'],
  peanuts:       ['đậu phộng', 'lạc', 'peanut', 'peanuts'],
  eggs:          ['trứng', 'hột vịt', 'egg', 'eggs'],
  milk:          ['sữa', 'bơ', 'phô mai', 'milk', 'dairy'],
  gluten:        ['gluten', 'lúa mì', 'bột mì', 'wheat'],
  soy:           ['đậu nành', 'tương', 'chao', 'soy', 'tofu'],
  coconut:       ['dừa', 'nước cốt dừa', 'coconut'],
  'shrimp-paste': ['mắm', 'mắm tôm', 'mắm ruốc', 'mắm cá']
};

/**
 * Phân loại món ăn vào nhóm mâm cơm hoặc đồ uống/khác
 * @param {Object} dish
 * @returns {'man'|'canh'|'xao_rau'|'trang_mieng'|'beverage'|'other'}
 */
export function classifyDishGroup(dish) {
  if (!dish) return 'other';
  const name = (dish.name || '').toLowerCase();
  const cat = (dish.category_name || dish.cat_name || dish.category_slug || '').toLowerCase();

  // 0. Bỏ qua đồ uống / thức uống / rượu
  if (dish.vat_category === 'alcohol' || dish.age_restricted === 1 ||
      cat.includes('đồ uống') || cat.includes('thức uống') || cat.includes('beverage') ||
      /cocktail|mocktail|trà |nước ép|sinh tố|cà phê|rượu|bia\b/.test(name)) {
    return 'beverage';
  }

  // 1. Tráng miệng (chè, bánh ngọt, rau câu, trái cây, kem...)
  // Lưu ý: Các loại bánh mặn/món nước như "bánh canh", "bánh xèo", "bánh khọt", "bánh hỏi", "bánh cống", "bò kho bánh mì" KHÔNG phải tráng miệng!
  const isSavoryCake = /bánh canh|bánh xèo|bánh khọt|bánh cống|bánh tằm|bánh hỏi|bánh mì|bánh tét chiên/.test(name);
  if (!isSavoryCake && (
      cat.includes('tráng miệng') || cat.includes('dessert') ||
      /chè|chuối nếp nướng|sương sâm|sương sáo|rau câu|da lợn|flan|bà ba|mủ gòn|mousse|kem |trái cây/.test(name)
  )) {
    return 'trang_mieng';
  }

  // 2. Món canh / lẩu (Canh chua, canh khổ qua, lẩu cá kèo, súp...)
  if (/canh|lẩu|soup|súp|bào ngư vi cá/.test(name) ||
      cat.includes('lẩu') ||
      (/bánh canh|hủ tiếu|bún mắm|bún nước lèo/.test(name) && !/xào|khô/.test(name))) {
    return 'canh';
  }

  // 3. Món xào / rau / gỏi / luộc
  if (/xào|rau|gỏi|luộc|kho quẹt|nộm|salad|bông bí|ngó sen|bắp chuối|rau muống|càng cua|đậu bắp|chuối non/.test(name)) {
    return 'xao_rau';
  }

  // 4. Món mặn (kho, rim, nướng, chiên, ram, hấp...)
  return 'man';
}

/**
 * Mở rộng từ khóa dị ứng 2 chiều giữa slug (tiếng Anh) và tên tiếng Việt
 * @param {string} term
 * @returns {string[]}
 */
export function expandAllergenTerms(term) {
  const t = String(term).toLowerCase().trim();
  const result = new Set([t]);

  for (const [slug, words] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (t === slug || words.some(w => t.includes(w) || w.includes(t))) {
      result.add(slug);
      for (const w of words) result.add(w);
    }
  }
  return Array.from(result);
}

/**
 * Kiểm tra xem một món có chứa bất kỳ dị ứng nào trong danh sách loại trừ không
 * @param {Object} dish
 * @param {string[]} excludedAllergens
 * @returns {boolean}
 */
export function hasAllergens(dish, excludedAllergens = []) {
  if (!dish || !Array.isArray(excludedAllergens) || excludedAllergens.length === 0) {
    return false;
  }

  // Lấy chuỗi dị ứng từ món
  let dishAllergens = [];
  if (Array.isArray(dish.allergens)) {
    dishAllergens = dish.allergens.map(a => String(a).toLowerCase());
  } else if (typeof dish.allergens === 'string' && dish.allergens.trim()) {
    dishAllergens = dish.allergens.toLowerCase().split(',').map(s => s.trim());
  }

  const name = (dish.name || '').toLowerCase();
  const desc = (dish.description || '').toLowerCase();

  for (const allergen of excludedAllergens) {
    const rawAllergen = String(allergen).toLowerCase().trim();
    if (!rawAllergen) continue;

    const terms = expandAllergenTerms(rawAllergen);
    for (const term of terms) {
      if (dishAllergens.includes(term)) return true;
      if (dishAllergens.some(a => a.includes(term) || term.includes(a))) return true;
      if (name.includes(term) || desc.includes(term)) return true;
    }
  }

  return false;
}

/**
 * Tính số lượng món và hệ số cho từng khẩu phần
 * @param {number} serves - 2, 4, 6, 8
 * @returns {{ multiplier: number, quantityPerDish: number, label: string }}
 */
export function getServesInfo(serves = 4) {
  const s = parseInt(serves, 10);
  switch (s) {
    case 2:
      return { multiplier: 1, quantityPerDish: 1, label: 'Khẩu phần 2 người (Ấm cúng)' };
    case 6:
      return { multiplier: 1.5, quantityPerDish: 1, label: 'Khẩu phần 6 người (Gia đình sum vầy)' };
    case 8:
      return { multiplier: 2, quantityPerDish: 2, label: 'Khẩu phần 8 người (Đại gia đình)' };
    case 4:
    default:
      return { multiplier: 1, quantityPerDish: 1, label: 'Khẩu phần 4 người (Chuẩn mâm tròn)' };
  }
}

/**
 * Thuật toán gợi ý mâm cơm gia đình tất định
 * @param {Object} options
 * @param {Array} options.dishes - Danh sách món ăn
 * @param {number} [options.serves=4] - Số người ăn (2, 4, 6, 8)
 * @param {string[]} [options.excludeAllergens=[]] - Danh sách dị ứng cần loại bỏ
 * @param {number} [options.seed=0] - Seed cho tính tất định
 * @param {Object} [options.offsets] - Offsets vị trí từng nhóm { man: 0, canh: 0, xao_rau: 0, trang_mieng: 0 }
 * @returns {Object} Mâm cơm gợi ý
 */
export function suggestFamilyMeal({
  dishes = [],
  serves = 4,
  excludeAllergens = [],
  seed = 0,
  offsets = { man: 0, canh: 0, xao_rau: 0, trang_mieng: 0 }
} = {}) {
  const safeServes = VALID_SERVES.includes(Number(serves)) ? Number(serves) : 4;
  const servesInfo = getServesInfo(safeServes);

  // 1. Lọc món hợp lệ: còn hàng, không cấm tuổi, không đồ uống, không dị ứng
  const availableDishes = (dishes || []).filter(d => {
    if (!d) return false;
    if (d.is_available === 0 || d.is_available === false) return false;
    if (d.age_restricted === 1 || d.vat_category === 'alcohol') return false;
    return true;
  });

  // Phân nhóm món sau khi lọc dị ứng
  const groups = {
    man: [],
    canh: [],
    xao_rau: [],
    trang_mieng: []
  };

  for (const dish of availableDishes) {
    if (hasAllergens(dish, excludeAllergens)) {
      continue;
    }
    const groupKey = classifyDishGroup(dish);
    if (groups[groupKey]) {
      groups[groupKey].push(dish);
    }
  }

  // 2. Chọn món tất định cho từng vị trí
  const items = {};
  const currentOffsets = { ...offsets };
  const candidateCounts = {};

  for (const { key } of MEAL_GROUPS) {
    const candidates = groups[key] || [];
    candidateCounts[key] = candidates.length;

    if (candidates.length === 0) {
      // Fallback nếu nhóm đó bị lọc hết: lấy từ toàn bộ món an toàn không dị ứng
      const fallbackList = availableDishes.filter(d => !hasAllergens(d, excludeAllergens));
      if (fallbackList.length > 0) {
        const idx = Math.abs(seed + (currentOffsets[key] || 0)) % fallbackList.length;
        items[key] = { ...fallbackList[idx], _isFallback: true };
      } else {
        items[key] = null;
      }
    } else {
      const offset = currentOffsets[key] || 0;
      // Công thức tất định: (seed + offset) mod length
      const normalizedIndex = ((Math.abs(seed) + offset) % candidates.length + candidates.length) % candidates.length;
      items[key] = candidates[normalizedIndex];
    }
  }

  // 3. Tính toán giá tiền mâm cơm
  let subtotal = 0;
  for (const key of ['man', 'canh', 'xao_rau', 'trang_mieng']) {
    const item = items[key];
    if (item && typeof item.price === 'number') {
      subtotal += item.price;
    }
  }

  // Áp dụng hệ số khẩu phần (nếu 6 người: 1.5x; 8 người: 2x)
  const totalPrice = Math.round((subtotal * servesInfo.multiplier) / 1000) * 1000;

  return {
    serves: safeServes,
    servesInfo,
    items,
    candidateCounts,
    totalPrice,
    subtotalBase: subtotal,
    seed,
    offsets: currentOffsets,
    excludeAllergens: [...excludeAllergens],
    _allDishes: dishes
  };
}

/**
 * Xoay vòng đổi món ở một vị trí cụ thể (man, canh, xao_rau, trang_mieng)
 * @param {Object} currentMeal - Kết quả từ suggestFamilyMeal
 * @param {'man'|'canh'|'xao_rau'|'trang_mieng'} groupKey - Vị trí cần đổi món
 * @param {number} direction - 1 (tiếp theo) hoặc -1 (lùi lại)
 * @param {Array} dishes - Toàn bộ danh sách món (tùy chọn nếu currentMeal đã có _allDishes)
 * @returns {Object} Mâm cơm mới với chỉ 1 món đổi
 */
export function rotateDishAtPosition(currentMeal, groupKey, direction = 1, dishes = []) {
  if (!currentMeal || !MEAL_GROUPS.some(g => g.key === groupKey)) {
    return currentMeal;
  }

  const nextOffsets = { ...currentMeal.offsets };
  const currentOffset = nextOffsets[groupKey] || 0;
  nextOffsets[groupKey] = currentOffset + direction;

  const dishList = (dishes && dishes.length > 0) ? dishes : (currentMeal._allDishes || []);

  return suggestFamilyMeal({
    dishes: dishList,
    serves: currentMeal.serves,
    excludeAllergens: currentMeal.excludeAllergens,
    seed: currentMeal.seed,
    offsets: nextOffsets
  });
}

// Hỗ trợ cả CommonJS cho Node.js unit test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MEAL_GROUPS,
    VALID_SERVES,
    classifyDishGroup,
    hasAllergens,
    expandAllergenTerms,
    getServesInfo,
    suggestFamilyMeal,
    rotateDishAtPosition
  };
}
