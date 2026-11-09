/**
 * UNIT TEST: LINT & CODE QUALITY CONFIGURATION (T31)
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');

test('Cấu hình ESLint và Prettier tồn tại và hợp lệ JSON', () => {
  const eslintPath = path.join(ROOT_DIR, '.eslintrc.json');
  const prettierPath = path.join(ROOT_DIR, '.prettierrc');

  assert.ok(fs.existsSync(eslintPath), 'File .eslintrc.json phải tồn tại');
  assert.ok(fs.existsSync(prettierPath), 'File .prettierrc phải tồn tại');

  // Đọc và parse JSON
  const eslintConfig = JSON.parse(fs.readFileSync(eslintPath, 'utf8'));
  const prettierConfig = JSON.parse(fs.readFileSync(prettierPath, 'utf8'));

  assert.ok(eslintConfig.rules, 'ESLint config phải có rules');
  assert.ok(prettierConfig.semi === true, 'Prettier semi phải là true');
  assert.ok(prettierConfig.singleQuote === true, 'Prettier singleQuote phải là true');
});

test('Script npm run lint thực thi thành công (exit code 0)', () => {
  const output = execSync('node scripts/lint.js', {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  });

  assert.ok(
    output.includes('Tất cả file mã nguồn đều đạt chuẩn cú pháp'),
    'Linter phải báo cáo thành công'
  );
  assert.ok(
    output.includes('0 lỗi'),
    'Không được có lỗi cú pháp hoặc vi phạm code quality'
  );
});
