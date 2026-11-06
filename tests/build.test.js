/**
 * UNIT TEST: BUILD PIPELINE (T32)
 * Chạy bằng node:test: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'client', 'dist');

test('Lệnh npm run build thực thi thành công và tạo thư mục client/dist/', () => {
  const output = execSync('node scripts/build.js', {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  });

  assert.ok(
    output.includes('Build hoàn tất thành công'),
    'Build pipeline phải báo cáo thành công'
  );
  assert.ok(fs.existsSync(DIST_DIR), 'Thư mục client/dist phải tồn tại');
  assert.ok(fs.existsSync(path.join(DIST_DIR, 'assets')), 'Thư mục client/dist/assets phải tồn tại');
});

test('Bundle CSS và JS trong dist/assets có hash hợp lệ', () => {
  const assetsDir = path.join(DIST_DIR, 'assets');
  const files = fs.readdirSync(assetsDir);

  const cssBundle = files.find(f => /^styles\.[a-f0-9]{8}\.min\.css$/.test(f));
  const jsBundle = files.find(f => /^main\.[a-f0-9]{8}\.min\.js$/.test(f));

  assert.ok(cssBundle, 'Phải có file bundle CSS với hash 8 ký tự hex (styles.[hash].min.css)');
  assert.ok(jsBundle, 'Phải có file bundle JS với hash 8 ký tự hex (main.[hash].min.js)');

  // Kiểm tra file không rỗng và đã được minify
  const cssContent = fs.readFileSync(path.join(assetsDir, cssBundle), 'utf8');
  assert.ok(cssContent.length > 5000, 'Bundle CSS phải có nội dung đầy đủ');
  assert.ok(!cssContent.includes('/* ---'), 'Bundle CSS phải được minify sạch comment');
});

test('File manifest.json và index.html production hợp lệ', () => {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Phải có file manifest.json');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(manifest.files['styles.css'], 'Manifest phải chứa ánh xạ styles.css');
  assert.ok(manifest.files['main.js'], 'Manifest phải chứa ánh xạ main.js');
  assert.ok(manifest.hashes.css, 'Manifest phải chứa hash CSS');
  assert.ok(manifest.hashes.js, 'Manifest phải chứa hash JS');

  const indexPath = path.join(DIST_DIR, 'index.html');
  assert.ok(fs.existsSync(indexPath), 'Phải có file dist/index.html');

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert.ok(indexHtml.includes(manifest.files['styles.css']), 'dist/index.html phải nhúng bundle CSS có hash');
  assert.ok(indexHtml.includes(manifest.files['main.js']), 'dist/index.html phải nhúng bundle JS có hash');
});
