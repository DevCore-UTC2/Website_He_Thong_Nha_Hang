/**
 * UNIT TEST: ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { readMoneyVND } = require('../shared/currencyToWords.js');

test('Đọc số tiền 0 đồng', () => {
  assert.equal(readMoneyVND(0), 'Không đồng');
});

test('Ví dụ kiểm thử bắt buộc: 290.000đ', () => {
  assert.equal(readMoneyVND(290000), 'Hai trăm chín mươi nghìn đồng');
});

test('Đọc các mệnh giá thông thường', () => {
  assert.equal(readMoneyVND(140000), 'Một trăm bốn mươi nghìn đồng');
  assert.equal(readMoneyVND(150000), 'Một trăm năm mươi nghìn đồng');
  assert.equal(readMoneyVND(1500000), 'Một triệu năm trăm nghìn đồng');
  assert.equal(readMoneyVND(10000000), 'Mười triệu đồng');
  assert.equal(readMoneyVND(21000), 'Hai mươi mốt nghìn đồng');
  assert.equal(readMoneyVND(25000), 'Hai mươi lăm nghìn đồng');
  assert.equal(readMoneyVND(105000), 'Một trăm lẻ năm nghìn đồng');
});
