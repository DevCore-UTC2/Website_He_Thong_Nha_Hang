/**
 * CẤU HÌNH THUẾ GTGT (VAT) — VỊ NHÀ MÌNH
 * Phục vụ tách thuế VAT từ giá niêm yết đã bao gồm thuế (PRICE_INCLUDES_VAT=true)
 * 
 * Quy định thuế suất:
 * - food / beverage: 8% (Nghị quyết giảm thuế áp dụng đến 31/12/2026), từ 01/01/2027 là 10%
 * - alcohol (rượu, bia): luôn là 10% (không thuộc diện giảm thuế)
 */

const PRICE_INCLUDES_VAT = true;

/**
 * Lấy thuế suất áp dụng cho từng danh mục hàng hóa tại thời điểm lập hóa đơn
 * @param {string} vatCategory - 'food' | 'alcohol' | 'beverage' | 'service'
 * @param {Date} [atDate=new Date()] - Thời điểm kiểm tra
 * @returns {number} Thuế suất (0.08 hoặc 0.10)
 */
function getVatRate(vatCategory, atDate = new Date()) {
  if (vatCategory === 'alcohol') {
    return 0.10; // Rượu bia luôn chịu thuế 10%
  }

  // Thời điểm chuyển giao: hết ngày 31/12/2026
  const cutoffDate = new Date('2027-01-01T00:00:00+07:00');
  const checkDate = new Date(atDate);

  if (checkDate < cutoffDate) {
    return 0.08; // 8% đến hết năm 2026
  }

  return 0.10; // 10% từ năm 2027
}

/**
 * Phân bổ số tiền (ví dụ giảm giá) theo tỷ lệ bằng phương pháp phần dư lớn nhất (Largest Remainder Method)
 * Đảm bảo tổng phân bổ khớp từng đồng VND, không lẻ thập phân.
 * @param {number[]} amounts - Mảng các giá trị cơ sở để phân bổ (VD: itemTotal của từng món)
 * @param {number} totalToDistribute - Tổng số tiền cần phân bổ (VD: discountAmount)
 * @returns {number[]} Mảng số nguyên đã phân bổ
 */
function distributeLargestRemainder(amounts, totalToDistribute) {
  if (totalToDistribute <= 0 || amounts.length === 0) {
    return amounts.map(() => 0);
  }

  const baseSum = amounts.reduce((acc, a) => acc + a, 0);
  if (baseSum <= 0) {
    return amounts.map(() => 0);
  }

  // Nếu tổng cần phân bổ >= tổng cơ sở (giảm 100%)
  if (totalToDistribute >= baseSum) {
    return amounts.map(a => Math.round(a));
  }

  const items = amounts.map((amount, index) => {
    const rawAlloc = (amount / baseSum) * totalToDistribute;
    const intAlloc = Math.floor(rawAlloc);
    const remainder = rawAlloc - intAlloc;
    return { index, intAlloc, remainder };
  });

  const sumInt = items.reduce((acc, it) => acc + it.intAlloc, 0);
  let leftover = Math.round(totalToDistribute - sumInt);

  // Sắp xếp các phần tử có phần dư lớn nhất trước để nhận 1 đồng dư
  items.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < leftover && i < items.length; i++) {
    items[i].intAlloc += 1;
  }

  // Sắp xếp lại theo thứ tự index ban đầu
  items.sort((a, b) => a.index - b.index);

  return items.map(it => it.intAlloc);
}

/**
 * Tách thuế từ giá niêm yết đã bao gồm VAT cho từng dòng hàng
 * @param {number} grossAmount - Thành tiền sau giảm giá (đã có VAT)
 * @param {number} vatRate - Thuế suất (0.08 hoặc 0.10)
 * @returns {{ amountBeforeVat: number, vatAmount: number }}
 */
function splitVatFromGross(grossAmount, vatRate) {
  if (grossAmount <= 0) {
    return { amountBeforeVat: 0, vatAmount: 0 };
  }

  // Tiền chưa thuế = Thành tiền sau giảm / (1 + vatRate)
  const amountBeforeVat = Math.round(grossAmount / (1 + vatRate));
  // Tiền VAT = Thành tiền sau giảm - Tiền chưa thuế (đảm bảo tổng khớp đúng từng đồng)
  const vatAmount = grossAmount - amountBeforeVat;

  return { amountBeforeVat, vatAmount };
}

module.exports = {
  PRICE_INCLUDES_VAT,
  getVatRate,
  distributeLargestRemainder,
  splitVatFromGross
};
