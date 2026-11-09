/**
 * PRODUCTION BUILD PIPELINE — VỊ NHÀ MÌNH (T32)
 * Gộp và minify JS + CSS ra thư mục client/dist/ có hash tên file
 * 
 * Chạy: npm run build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.join(__dirname, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const DIST_DIR = path.join(CLIENT_DIR, 'dist');
const ASSETS_DIST_DIR = path.join(DIST_DIR, 'assets');

/** Tạo hash MD5 8 ký tự từ nội dung */
function getHash(content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

/** Minify CSS: xóa comment, khoảng trắng thừa, dòng trống */
function minifyCss(cssContent) {
  return cssContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // xóa comment
    .replace(/\s+/g, ' ')             // gộp khoảng trắng
    .replace(/\s*([\{\}\:\;\,\>])\s*/g, '$1') // xóa khoảng trắng quanh dấu
    .replace(/;(?=\})/g, '')          // xóa dấu chấm phẩy trước đóng ngoặc
    .trim();
}

/** Minify JS cơ bản an toàn cho ES Modules */
function minifyJs(jsContent) {
  return jsContent
    .replace(/\/\*[\s\S]*?\*\//g, '')       // xóa block comment
    .replace(/^\s*\/\/.*$/gm, '')           // xóa single line comment
    .replace(/[ \t]+/g, ' ')                // gộp khoảng trắng
    .replace(/\n\s*\n/g, '\n')              // xóa dòng trống
    .trim();
}

/** Copy đệ quy thư mục */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function runBuild() {
  console.log('🚀 Bắt đầu quá trình build production cho Vị Nhà Mình...\n');
  const startTime = Date.now();

  // 1. Dọn dẹp hoặc tạo mới thư mục client/dist/
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(ASSETS_DIST_DIR, { recursive: true });

  // 2. Gộp & Minify toàn bộ CSS theo đúng thứ tự nạp
  const cssFiles = [
    'tokens.css',
    'base.css',
    'utilities.css',
    'responsive.css',
    'family-meal.css'
  ];

  let combinedCss = '';
  for (const file of cssFiles) {
    const filePath = path.join(CLIENT_DIR, 'src', 'styles', file);
    if (fs.existsSync(filePath)) {
      combinedCss += `\n/* --- ${file} --- */\n` + fs.readFileSync(filePath, 'utf8');
    }
  }

  const minifiedCss = minifyCss(combinedCss);
  const cssHash = getHash(minifiedCss);
  const cssFileName = `styles.${cssHash}.min.css`;
  const cssOutputPath = path.join(ASSETS_DIST_DIR, cssFileName);
  fs.writeFileSync(cssOutputPath, minifiedCss, 'utf8');

  console.log(`📦 Đã gộp và minify CSS (${cssFiles.length} files) → assets/${cssFileName} (${(minifiedCss.length / 1024).toFixed(2)} KB)`);

  // 3. Minify JS chính (Main entry point)
  const mainJsPath = path.join(CLIENT_DIR, 'src', 'main.js');
  let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
  const minifiedMainJs = minifyJs(mainJsContent);
  const jsHash = getHash(minifiedMainJs);
  const jsFileName = `main.${jsHash}.min.js`;
  const jsOutputPath = path.join(ASSETS_DIST_DIR, jsFileName);
  fs.writeFileSync(jsOutputPath, minifiedMainJs, 'utf8');

  console.log(`⚡ Đã minify JS Entry Point → assets/${jsFileName} (${(minifiedMainJs.length / 1024).toFixed(2)} KB)`);

  // Copy toàn bộ source JS modules sang dist/src/ và dist/assets/ để trình duyệt ES Modules import đầy đủ
  copyDirSync(path.join(CLIENT_DIR, 'src'), path.join(DIST_DIR, 'src'));
  copyDirSync(path.join(CLIENT_DIR, 'src'), ASSETS_DIST_DIR);

  // 4. Tạo manifest.json
  const manifest = {
    name: 'Vị Nhà Mình',
    version: '2.0.0',
    buildTime: new Date().toISOString(),
    files: {
      'styles.css': `assets/${cssFileName}`,
      'main.js': `assets/${jsFileName}`
    },
    hashes: {
      css: cssHash,
      js: jsHash
    }
  };

  fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('📝 Đã sinh file client/dist/manifest.json');

  // 5. Xây dựng client/dist/index.html từ index.html gốc
  const rawIndexHtml = fs.readFileSync(path.join(CLIENT_DIR, 'index.html'), 'utf8');

  // Thay thế các thẻ link CSS bằng bundle duy nhất
  let prodIndexHtml = rawIndexHtml.replace(
    /<!-- CSS -->[\s\S]*?<style>/i,
    `<!-- CSS Production Bundle -->\n  <link rel="stylesheet" href="/dist/assets/${cssFileName}" />\n\n  <style>`
  );

  // Thay thế script main.js gốc bằng file dist có hash
  prodIndexHtml = prodIndexHtml.replace(
    /<script\s+type="module"\s+src="\.\/src\/main\.js"><\/script>/i,
    `<script type="module" src="/dist/assets/${jsFileName}"></script>`
  );

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), prodIndexHtml, 'utf8');
  console.log('📄 Đã sinh file client/dist/index.html với file hashes production');

  // 6. Copy thư mục public (icons, images) sang dist/
  copyDirSync(path.join(CLIENT_DIR, 'public'), path.join(DIST_DIR, 'public'));
  console.log('🖼️  Đã copy tài nguyên tĩnh /public sang client/dist/public/');

  // Copy các trang HTML phụ
  const otherPages = ['404.html', 'hoa-don.html', 'tra-cuu-hoa-don.html', 'chinh-sach-bao-mat.html'];
  for (const page of otherPages) {
    const srcPage = path.join(CLIENT_DIR, page);
    if (fs.existsSync(srcPage)) {
      fs.copyFileSync(srcPage, path.join(DIST_DIR, page));
    }
  }

  const duration = Date.now() - startTime;
  console.log(`\n✨ Build hoàn tất thành công trong ${duration}ms! Thư mục đích: client/dist/`);
}

// Thực thi nếu gọi trực tiếp từ CLI
if (require.main === module) {
  runBuild();
}

module.exports = { runBuild };
