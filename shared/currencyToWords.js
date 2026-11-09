/**
 * HÀM ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT (VND)
 * Dùng cho Hóa đơn điện tử theo quy chuẩn Kế toán Việt Nam
 * Hỗ trợ các quy tắc: lẻ/linh, mốt, lăm, mười, triệu, tỷ.
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/**
 * Đọc khối 3 chữ số
 * @param {number} n
 * @param {boolean} showZeroHundreds
 * @returns {string}
 */
function readThreeDigits(n, showZeroHundreds) {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;
  let res = '';

  if (hundreds > 0 || showZeroHundreds) {
    res += DIGITS[hundreds] + ' trăm ';
  }

  if (tens === 0 && units > 0) {
    if (hundreds > 0 || showZeroHundreds) res += 'lẻ ';
    res += DIGITS[units];
  } else if (tens === 1) {
    res += 'mười ';
    if (units === 1) res += 'một';
    else if (units === 5) res += 'lăm';
    else if (units > 0) res += DIGITS[units];
  } else if (tens > 1) {
    res += DIGITS[tens] + ' mươi ';
    if (units === 1) res += 'mốt';
    else if (units === 5) res += 'lăm';
    else if (units > 0) res += DIGITS[units];
  }

  return res.trim();
}

/**
 * Đọc số nguyên dương thành chữ tiếng Việt
 * @param {number|string} amount - Số tiền VND (số nguyên, không âm)
 * @returns {string} Chuỗi đọc thành chữ, viết hoa chữ cái đầu và kết thúc bằng "đồng"
 */
export function readMoneyVND(amount) {
  const num = typeof amount === 'number' ? Math.round(amount) : parseInt(String(amount).replace(/\D/g, ''), 10);

  if (isNaN(num) || num === 0) {
    return 'Không đồng';
  }

  if (num < 0) {
    return 'Âm ' + readMoneyVND(Math.abs(num)).toLowerCase();
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let temp = num;
  const groups = [];

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val > 0) {
      // Hiện "không trăm" nếu không phải nhóm cao nhất
      const showZero = i < groups.length - 1;
      const part = readThreeDigits(val, showZero);
      const scale = scales[i];
      words.push(scale ? `${part} ${scale}` : part);
    }
  }

  let result = words.join(' ').trim() + ' đồng';
  // Viết hoa chữ cái đầu tiên
  result = result.charAt(0).toUpperCase() + result.slice(1);

  return result.replace(/\s+/g, ' ');
}

// Hỗ trợ cả CommonJS cho Node server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { readMoneyVND };
}
