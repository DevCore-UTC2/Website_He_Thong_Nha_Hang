/**
 * SEASON HELPER — VỊ NHÀ MÌNH (T29)
 * Quản lý tính năng "Món Đang Vào Mùa" của ẩm thực miền Tây & Nam Bộ
 * 
 * Hỗ trợ:
 * - Xác định tháng theo múi giờ Asia/Ho_Chi_Minh (1–12).
 * - Hỗ trợ ghi đè tháng để kiểm thử (Test month override qua sessionStorage hoặc query param).
 * - Tên mùa văn hóa ẩm thực miền Nam (Mùa nước nổi, mùa gặt, mùa trái cây...).
 * - Kiểm tra món có đang vào vụ rộ không.
 */

/** Danh mục các mùa đặc trưng miền Tây Nam Bộ */
export const MEKONG_SEASONS = {
  FLOOD: {
    months: [8, 9, 10, 11],
    name: 'Mùa nước nổi miền Tây',
    highlight: 'Cá linh non, bông điên điển, bông súng ma, cá rô đồng'
  },
  HARVEST_TET: {
    months: [12, 1, 2],
    name: 'Mùa gặt & giáp Tết Nam Bộ',
    highlight: 'Chuột đồng nướng, lúa mới, thịt kho hột vịt nước dừa'
  },
  HOT_FRUIT: {
    months: [3, 4, 5, 6],
    name: 'Mùa nắng ấm & miệt vườn sum suê',
    highlight: 'Kem dừa Bến Tre, trái cây tươi, món gỏi thanh nhiệt'
  },
  EARLY_RAIN: {
    months: [7],
    name: 'Mùa mưa đầu vụ',
    highlight: 'Nấm tràm, măng le, rau đắng đồng'
  }
};

/**
 * Parse chuỗi season_months thành mảng số nguyên các tháng [1..12]
 * @param {string|number[]|null} raw
 * @returns {number[]}
 */
export function parseSeasonMonths(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(m => parseInt(m, 10)).filter(m => m >= 1 && m <= 12);
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed.map(m => parseInt(m, 10)).filter(m => m >= 1 && m <= 12);
    }
  } catch {
    // Không phải JSON
  }
  return [];
}

/**
 * Lấy tháng hiện tại (1–12) theo múi giờ Asia/Ho_Chi_Minh hoặc tháng kiểm thử
 * @param {number|null} [explicitMonth=null]
 * @returns {number}
 */
export function getCurrentSeasonMonth(explicitMonth = null) {
  if (explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return parseInt(explicitMonth, 10);
  }

  // Kiểm tra override từ trình duyệt nếu chạy ở client
  if (typeof window !== 'undefined') {
    // 1. Kiểm tra URL query param ?month=X hoặc ?test_month=X
    try {
      const params = new URLSearchParams(window.location.search);
      const qMonth = params.get('month') || params.get('test_month');
      if (qMonth) {
        const m = parseInt(qMonth, 10);
        if (m >= 1 && m <= 12) return m;
      }
    } catch {}

    // 2. Kiểm tra sessionStorage
    try {
      const savedMonth = sessionStorage.getItem('vnm_test_month');
      if (savedMonth) {
        const m = parseInt(savedMonth, 10);
        if (m >= 1 && m <= 12) return m;
      }
    } catch {}
  }

  // Mặc định lấy theo múi giờ Asia/Ho_Chi_Minh
  try {
    const vnDateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      month: 'numeric'
    }).format(new Date());
    return parseInt(vnDateStr, 10);
  } catch {
    return new Date().getMonth() + 1;
  }
}

/**
 * Kiểm tra xem một món có đang vào đúng mùa trong tháng chỉ định không
 * @param {Object} dish
 * @param {number|null} [month=null]
 * @returns {boolean}
 */
export function isDishInSeason(dish, month = null) {
  if (!dish) return false;
  const targetMonth = month || getCurrentSeasonMonth();
  const months = parseSeasonMonths(dish.season_months);
  return months.includes(targetMonth);
}

/**
 * Lấy thông tin mùa văn hóa ẩm thực theo tháng
 * @param {number|null} [month=null]
 * @returns {{ name: string, highlight: string, month: number, isFloodSeason: boolean }}
 */
export function getSeasonInfo(month = null) {
  const m = month || getCurrentSeasonMonth();
  for (const season of Object.values(MEKONG_SEASONS)) {
    if (season.months.includes(m)) {
      return {
        month: m,
        name: season.name,
        highlight: season.highlight,
        isFloodSeason: season.months.includes(8) // Mùa nước nổi
      };
    }
  }
  return {
    month: m,
    name: `Ẩm thực miền Tây tháng ${m}`,
    highlight: 'Hương vị đồng quê bốn mùa tươi ngon',
    isFloodSeason: false
  };
}

/**
 * Lọc danh sách món ăn đang vào mùa
 * @param {Array} dishes
 * @param {number|null} [month=null]
 * @param {boolean} [onlyInSeason=true]
 * @returns {Array}
 */
export function filterSeasonalDishes(dishes = [], month = null, onlyInSeason = true) {
  const targetMonth = month || getCurrentSeasonMonth();
  if (!onlyInSeason) return dishes;

  return (dishes || []).filter(dish => {
    return isDishInSeason(dish, targetMonth);
  });
}

// Hỗ trợ CommonJS cho Node.js unit tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MEKONG_SEASONS,
    parseSeasonMonths,
    getCurrentSeasonMonth,
    isDishInSeason,
    getSeasonInfo,
    filterSeasonalDishes
  };
}
