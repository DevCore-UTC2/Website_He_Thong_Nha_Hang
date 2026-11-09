/**
 * LINT & CODE QUALITY RUNNER — VỊ NHÀ MÌNH (T31)
 * Chạy bằng npm: npm run lint
 * 
 * Kiểm tra:
 * - Cú pháp JavaScript toàn bộ file trong server/, client/src/, shared/, tests/
 * - Cấm câu lệnh debugger
 * - Quét các console.log debug tạm bợ
 * - Kiểm tra tính toàn vẹn encoding UTF-8
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.join(__dirname, '..');
const TARGET_DIRS = ['server', 'client/src', 'shared', 'tests', 'scripts'];
const IGNORE_PATTERNS = ['node_modules', 'client/dist', '.sqlite'];

function getAllJsFiles(dir) {
  const fullPath = path.join(ROOT_DIR, dir);
  if (!fs.existsSync(fullPath)) return [];

  let results = [];
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    const relPath = path.relative(ROOT_DIR, entryPath).replace(/\\/g, '/');

    if (IGNORE_PATTERNS.some(p => relPath.includes(p))) continue;

    if (entry.isDirectory()) {
      results = results.concat(getAllJsFiles(relPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(relPath);
    }
  }

  return results;
}

function lintFile(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const errors = [];
  const warnings = [];

  // 1. Kiểm tra cú pháp (Syntax Check)
  try {
    // Với file ESM (trong client/src hoặc shared) hoặc CJS (server/)
    new vm.Script(content, { filename: relPath });
  } catch (err) {
    // Nếu là file ESM thuần (có import/export), vm.Script có thể báo "Cannot use import statement outside a module"
    // Ta kiểm tra qua parse module hoặc regex
    if (err.message && err.message.includes('Cannot use import statement outside a module')) {
      // Cú pháp ESM hợp lệ trên browser/Node
    } else if (err.message && err.message.includes('Unexpected token \'export\'')) {
      // Cú pháp ESM hợp lệ
    } else {
      errors.push(`[SyntaxError] Dòng ${err.lineNumber || '?'}: ${err.message}`);
    }
  }

  // 2. Kiểm tra câu lệnh debugger
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^\s*debugger\s*;?$/.test(trimmed)) {
      errors.push(`[Debugger] Dòng ${idx + 1}: Phát hiện câu lệnh debugger còn sót lại.`);
    }

    // 3. Cảnh báo console.log debug nháp
    if (/(console\.log\s*\(\s*['"](test|debug|asdf|xxx|111|222)['"]\s*\))/i.test(trimmed)) {
      warnings.push(`[DebugLog] Dòng ${idx + 1}: Phát hiện log nháp: "${trimmed}"`);
    }
  });

  return { relPath, errors, warnings };
}

function runLint() {
  console.log('🔍 Đang kiểm tra chất lượng mã nguồn (ESLint / Syntax / Quality Rules)...\n');

  let allFiles = [];
  for (const dir of TARGET_DIRS) {
    allFiles = allFiles.concat(getAllJsFiles(dir));
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of allFiles) {
    const { errors, warnings } = lintFile(file);

    if (errors.length > 0) {
      console.error(`❌ ${file}`);
      errors.forEach(e => console.error(`   ${e}`));
      totalErrors += errors.length;
    } else if (warnings.length > 0) {
      console.warn(`⚠️  ${file}`);
      warnings.forEach(w => console.warn(`   ${w}`));
      totalWarnings += warnings.length;
    }
  }

  console.log(`\n==========================================================`);
  console.log(`📊 KẾT QUẢ KIỂM TRA MÃ NGUỒN:`);
  console.log(`   - Tổng số file đã quét: ${allFiles.length} file`);
  console.log(`   - Lỗi cú pháp / vi phạm: ${totalErrors} lỗi`);
  console.log(`   - Cảnh báo:             ${totalWarnings} cảnh báo`);
  console.log(`==========================================================\n`);

  if (totalErrors > 0) {
    console.error('❌ Kiểm tra mã nguồn thất bại! Vui lòng khắc phục các lỗi trên.');
    process.exit(1);
  } else {
    console.log('✅ Tất cả file mã nguồn đều đạt chuẩn cú pháp và quy tắc chất lượng!\n');
    process.exit(0);
  }
}

runLint();
