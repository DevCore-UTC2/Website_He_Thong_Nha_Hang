/**
 * UNIT TEST: T34 - HỆ THỐNG TÀI LIỆU ĐỒ ÁN
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.resolve(rootDir, 'docs');

test('T34 - Kiểm tra tính đầy đủ và toàn vẹn của hệ thống tài liệu đồ án', async (t) => {
  await t.test('Các tài liệu bắt buộc phải tồn tại và có dung lượng hợp lệ (> 500 bytes)', () => {
    const requiredFiles = [
      'BAO_CAO_DAN_Y.md',
      'TEST_REPORT.md',
      'DEMO_SCRIPT.md',
      'PHAN_CONG_NHOM.md',
      'LIMITATIONS.md',
      'FINAL_REPORT.md',
      'BROWSER_MATRIX.md',
      'DATA_ISSUES.md',
      'SPEC.md',
      'TASKS.md',
      'HANDOFF.md',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(docsDir, file);
      assert.ok(fs.existsSync(filePath), `Tệp docs/${file} phải tồn tại`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 500, `Tệp docs/${file} phải có nội dung (> 500 bytes), hiện tại: ${stat.size} bytes`);
    }

    // Kiểm tra README.md ở root
    const readmePath = path.join(rootDir, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'README.md ở thư mục gốc phải tồn tại');
    const readmeStat = fs.statSync(readmePath);
    assert.ok(readmeStat.size > 1000, `README.md phải có dung lượng chi tiết (> 1000 bytes), hiện tại: ${readmeStat.size} bytes`);
  });

  await t.test('README.md đã được chuyển đổi hoàn toàn sang "Vị Nhà Mình", không còn vết "SmartBite"', () => {
    const readmeContent = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf-8');
    assert.ok(readmeContent.includes('Vị Nhà Mình'), 'README.md phải chứa tên thương hiệu Vị Nhà Mình');
    assert.ok(!readmeContent.includes('SmartBite'), 'README.md không được chứa tên thương hiệu cũ SmartBite');
    assert.ok(readmeContent.includes('Nghị định 123/2020'), 'README.md phải đề cập đến Nghị định 123/2020');
    assert.ok(readmeContent.includes('WCAG 2.1 AA'), 'README.md phải đề cập đến chuẩn tiếp cận WCAG 2.1 AA');
  });

  await t.test('DEMO_SCRIPT.md có cấu trúc phân bổ thời lượng và kịch bản từng phút', () => {
    const scriptContent = fs.readFileSync(path.join(docsDir, 'DEMO_SCRIPT.md'), 'utf-8');
    assert.ok(scriptContent.includes('00:00 – 01:15') || scriptContent.includes('00:00'), 'Phải có mốc thời gian mở đầu');
    assert.ok(scriptContent.includes('Mâm cơm gia đình'), 'Phải có phần demo Mâm cơm gia đình');
    assert.ok(scriptContent.includes('Hóa đơn điện tử') || scriptContent.includes('VAT'), 'Phải có phần demo VAT / Hóa đơn điện tử');
    assert.ok(scriptContent.includes('Q&A') || scriptContent.includes('HỘI ĐỒNG'), 'Phải có phần trả lời câu hỏi phản biện');
  });

  await t.test('PHAN_CONG_NHOM.md có ma trận phân công 4 thành viên và bảng tự đánh giá', () => {
    const phanCongContent = fs.readFileSync(path.join(docsDir, 'PHAN_CONG_NHOM.md'), 'utf-8');
    assert.ok(phanCongContent.includes('Nguyễn Văn A'), 'Phải có thành viên 1');
    assert.ok(phanCongContent.includes('Trần Thị B'), 'Phải có thành viên 2');
    assert.ok(phanCongContent.includes('Lê Hoàng C'), 'Phải có thành viên 3');
    assert.ok(phanCongContent.includes('Phạm Minh D'), 'Phải có thành viên 4');
    assert.ok(/rubric/i.test(phanCongContent), 'Phải có bảng tự đánh giá theo Rubric');
  });

  await t.test('LIMITATIONS.md có đầy đủ các phân tích giới hạn và lộ trình phát triển', () => {
    const limitContent = fs.readFileSync(path.join(docsDir, 'LIMITATIONS.md'), 'utf-8');
    assert.ok(limitContent.includes('Hóa đơn điện tử'), 'Phải phân tích giới hạn HĐĐT');
    assert.ok(limitContent.includes('Thanh toán'), 'Phải phân tích giới hạn Cổng thanh toán');
    assert.ok(limitContent.includes('SQLite3') || limitContent.includes('PostgreSQL'), 'Phải phân tích giới hạn CSDL');
    assert.ok(/roadmap|lộ trình/i.test(limitContent), 'Phải có lộ trình phát triển');
  });
});
