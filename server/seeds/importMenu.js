/**
 * IMPORT MENU — VỊ NHÀ MÌNH
 * Đọc server/seeds/menu.csv → upsert vào SQLite
 *
 * Chạy: npm run seed:menu
 *
 * Quy tắc parse:
 * - Giá: "2,8" → 280000 (đơn vị trăm nghìn, dấu phẩy thập phân → × 100000)
 * - Thể loại: Món phụ→khai-vi, Món chính→mon-chinh, Món nước→mon-nuoc/lau-va-mon-nuoc,
 *             Tráng miệng→trang-mieng, Thức uống→thuc-uong
 * - Độ cay: Không cay→0, Cay nhẹ→1, Cay vừa→2, Cay→2, Rất cay→3
 * - vat_category: mặc định 'food'; Rượu đế Gò Đen→'alcohol'
 * - age_restricted: 1 nếu ghi chú có "18 tuổi" hoặc "alcohol"
 * - season_months: phát hiện từ ghi chú (tháng 8–11 = mùa nước nổi)
 * - serves: phát hiện "2–3 người", "3–4 người" trong ghi chú
 * - preorder_hours: "Đặt trước 1–2 giờ" → 1
 * - Dòng thiếu tên → bỏ qua (ghi vào DATA_ISSUES.md)
 * - Dòng thiếu giá → nháp (is_available=0)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { dbAsync, initDatabase } = require('../config/db');

// ——————————————————————————————————————————
// CONSTANTS
// ——————————————————————————————————————————

const CSV_PATH     = path.join(__dirname, 'menu.csv');
const REPORT_PATH  = path.join(__dirname, '../../docs/DATA_ISSUES.md');

/** Ánh xạ thể loại CSV → slug danh mục DB */
const CATEGORY_MAP = {
  'Món phụ':     'khai-vi',
  'Món chính':   'mon-chinh',
  'Món nước':    'mon-nuoc',
  'Tráng miệng': 'trang-mieng',
  'Thức uống':   'do-uong',
};

/** Ánh xạ tên mùa / tháng thường gặp trong ghi chú */
const SEASON_PATTERNS = [
  { re: /mùa nước nổi|tháng 8|từ tháng 8/i, months: [8,9,10,11] },
  { re: /tháng 8 đến 11/i,                  months: [8,9,10,11] },
  { re: /theo mùa nước/i,                   months: [8,9,10,11] },
  { re: /mùa nóng/i,                        months: [3,4,5,6]   },
  { re: /theo mùa/i,                        months: null         }, // ghi nhận nhưng không mã hóa
];

// ——————————————————————————————————————————
// HELPERS
// ——————————————————————————————————————————

/** Chuyển tên tiếng Việt → slug ASCII */
function toSlug(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Parse giá: "2,8" → 280000; "1,20" → 120000 */
function parsePrice(raw) {
  if (!raw || !raw.trim()) return null;
  // Dấu phẩy là thập phân (trăm nghìn), dấu chấm có thể là phân cách nghìn
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  if (isNaN(val) || val <= 0) return null;
  return Math.round(val * 100000); // trăm nghìn → đồng
}

/** Parse độ cay */
function parseSpice(raw) {
  const s = (raw || '').trim().toLowerCase();
  if (!s || s.includes('không cay'))  return 0;
  if (s.includes('cay nhẹ'))          return 1;
  if (s.includes('cay vừa'))          return 2;
  if (s.includes('rất cay'))          return 3;
  if (s.includes('cay'))              return 2;
  return 0;
}

/** Phát hiện season_months từ ghi chú */
function parseSeason(note) {
  if (!note) return null;
  for (const { re, months } of SEASON_PATTERNS) {
    if (re.test(note)) return months ? JSON.stringify(months) : null;
  }
  return null;
}

/** Phát hiện serves từ ghi chú */
function parseServes(note) {
  if (!note) return 1;
  const m = note.match(/(\d+)\s*[–-]\s*(\d+)\s*người/);
  if (m) return parseInt(m[1], 10); // lấy số tối thiểu
  const m2 = note.match(/(\d+)\s*người/);
  if (m2) return parseInt(m2[1], 10);
  return 1;
}

/** Phát hiện preorder_hours từ ghi chú */
function parsePreorder(note) {
  if (!note) return 0;
  const m = note.match(/[Đđ]ặt trước\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

/** Phát hiện age_restricted từ ghi chú + tên */
function parseAgeRestricted(note, name, vatCat) {
  if (vatCat === 'alcohol') return 1;
  const combined = `${note || ''} ${name || ''}`.toLowerCase();
  return /18 tuổi|rượu/.test(combined) ? 1 : 0;
}

/** Phát hiện vat_category */
function parseVatCategory(name) {
  const n = (name || '').toLowerCase().trim();
  if (/rượu|wine|whisky|beer|^bia$/.test(n)) return 'alcohol';
  return 'food';
}

/** Parse dị ứng từ chuỗi "Hải sản (tôm), đậu phộng" */
function parseAllergens(raw) {
  if (!raw || raw.trim().toLowerCase() === 'không') return [];
  // Tách bởi dấu phẩy, chuẩn hóa
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Map một chuỗi allergen thô về slug trong DB
 * (khớp mờ — chứa từ khóa)
 */
function allergenToSlug(rawTag) {
  const t = rawTag.toLowerCase();
  if (/gluten|lúa mì|bột mì/.test(t))          return 'gluten';
  if (/giáp xác|cua đinh/.test(t))             return 'crustaceans';
  if (/nhuyễn thể|ốc|sò|nghêu/.test(t))        return 'molluscs';
  if (/tôm\b|tép/.test(t) && !/mắm/.test(t))  return 'shrimp';
  if (/cua\b/.test(t))                          return 'crab';
  if (/(^|[^\p{L}])cá($|[^\p{L}])|thác lác/u.test(t)) return 'fish';
  if (/trứng/.test(t))                          return 'eggs';
  if (/sữa/.test(t))                            return 'milk';
  if (/đậu phộng/.test(t))                      return 'peanuts';
  if (/đậu nành|tương|nước tương|chao/.test(t)) return 'soy';
  if (/dừa/.test(t))                            return 'coconut';
  if (/đậu xanh/.test(t))                       return 'mungbean';
  if (/mắm/.test(t))                            return 'shrimp-paste';
  return 'other';
}

// ——————————————————————————————————————————
// PARSE CSV (thủ công, không dùng thư viện ngoài)
// ——————————————————————————————————————————

function parseCSV(content) {
  const rows = [];
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Bỏ dòng header (dòng 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse cột có thể có ngoặc kép bao quanh (CSV RFC 4180)
    const cols = [];
    let cur = '';
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQ && line[j+1] === '"') { cur += '"'; j++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);

    rows.push({
      category: (cols[0] || '').trim(),
      name:     (cols[1] || '').trim(),
      priceRaw: (cols[2] || '').trim(),
      desc:     (cols[3] || '').trim(),
      image:    (cols[4] || '').trim(),
      allergens:(cols[5] || '').trim(),
      spiceRaw: (cols[6] || '').trim(),
      note:     (cols[7] || '').trim(),
      lineNum:  i + 1,
    });
  }
  return rows;
}

// ——————————————————————————————————————————
// MAIN
// ——————————————————————————————————————————

async function main() {
  console.log('🌱 Bắt đầu import menu từ menu.csv...\n');

  // Khởi tạo DB (chạy migrations)
  await initDatabase();

  // Đọc CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(csvContent);

  // Load allergen slugs → id
  const allergenRows = await dbAsync.all('SELECT id, slug FROM allergens');
  const allergenMap  = Object.fromEntries(allergenRows.map(r => [r.slug, r.id]));

  // Load categories slug → id (tạo nếu chưa có)
  const catSlugToId = {};

  const defaultCategories = [
    { name: 'Khai vị',            slug: 'khai-vi',        icon: '🥗', sort: 1 },
    { name: 'Món chính',          slug: 'mon-chinh',       icon: '🍽️', sort: 2 },
    { name: 'Lẩu & Món nước',     slug: 'mon-nuoc',        icon: '🍲', sort: 3 },
    { name: 'Tráng miệng',        slug: 'trang-mieng',     icon: '🍨', sort: 4 },
    { name: 'Đồ uống',            slug: 'do-uong',         icon: '🍹', sort: 5 },
  ];

  for (const cat of defaultCategories) {
    await dbAsync.run(
      `INSERT OR IGNORE INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)`,
      [cat.name, cat.slug, cat.icon, cat.sort]
    );
    const row = await dbAsync.get('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    catSlugToId[cat.slug] = row.id;
  }

  // Thống kê
  const stats = { added: 0, updated: 0, skipped: 0, draft: 0, errors: [] };
  const issues = []; // DATA_ISSUES

  for (const row of rows) {
    // Bỏ qua dòng trống
    if (!row.category && !row.name) continue;

    // ——— Dòng thiếu tên ———
    if (!row.name) {
      // Thử suy đoán từ tên ảnh
      if (row.image) {
        const guessed = row.image
          .replace(/\.jpg$/i,'')
          .replace(/-/g,' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        issues.push({
          line: row.lineNum,
          severity: 'WARN',
          msg: `Thiếu tên món. Suy đoán từ ảnh: "${guessed}" (dòng CSV ${row.lineNum}).`,
        });
      } else {
        issues.push({ line: row.lineNum, severity: 'SKIP', msg: `Thiếu tên và ảnh — bỏ qua dòng ${row.lineNum}.` });
        stats.skipped++;
      }
      continue;
    }

    // ——— Category ———
    const catSlug = CATEGORY_MAP[row.category];
    if (!catSlug) {
      // Không có danh mục → bỏ qua
      issues.push({ line: row.lineNum, severity: 'SKIP', msg: `Thể loại không nhận dạng được: "${row.category}" (${row.name}).` });
      stats.skipped++;
      continue;
    }
    const categoryId = catSlugToId[catSlug];
    if (!categoryId) {
      stats.errors.push(`Không tìm thấy categoryId cho slug "${catSlug}" (${row.name})`);
      continue;
    }

    // ——— Giá ———
    const price = parsePrice(row.priceRaw);
    const isDraft = price === null;
    if (isDraft) {
      issues.push({ line: row.lineNum, severity: 'DRAFT', msg: `"${row.name}" — thiếu giá, đặt là nháp (is_available=0).` });
    }

    // ——— Các trường khác ———
    const slug          = toSlug(row.name);
    const vatCategory   = parseVatCategory(row.name);
    const ageRestricted = parseAgeRestricted(row.note, row.name, vatCategory);
    const spiceLevel    = parseSpice(row.spiceRaw);
    const seasonMonths  = parseSeason(row.note);
    const serves        = parseServes(row.note);
    const preorderHours = parsePreorder(row.note);
    const description   = row.desc || null;
    const image         = row.image || null;

    // Kiểm tra thiếu mô tả / ảnh → ghi vào issues
    if (!description) {
      issues.push({ line: row.lineNum, severity: 'INFO', msg: `"${row.name}" — thiếu mô tả.` });
    }
    if (!image) {
      issues.push({ line: row.lineNum, severity: 'INFO', msg: `"${row.name}" — thiếu ảnh.` });
    }

    // ——— Upsert dish ———
    try {
      const existing = await dbAsync.get('SELECT id FROM dishes WHERE slug = ?', [slug]);

      if (existing) {
        await dbAsync.run(
          `UPDATE dishes SET
            category_id=?, name=?, description=?, price=?, image=?,
            spice_levels_allowed=?, is_available=?, dietary_tags=?,
            vat_category=?, age_restricted=?, preorder_hours=?,
            season_months=?, serves=?, updated_at=CURRENT_TIMESTAMP
          WHERE slug=?`,
          [
            categoryId, row.name, description, price ?? 0, image,
            3, isDraft ? 0 : 1, null,
            vatCategory, ageRestricted, preorderHours,
            seasonMonths, serves, slug,
          ]
        );
        stats.updated++;
      } else {
        await dbAsync.run(
          `INSERT INTO dishes
            (category_id, name, slug, description, price, original_price,
             image, spice_levels_allowed, is_available, is_featured, is_new,
             dietary_tags, prep_minutes, rating_avg, rating_count,
             vat_category, age_restricted, preorder_hours, season_months, serves)
          VALUES (?,?,?,?,?,0,?,3,?,0,0,null,20,5.0,0,?,?,?,?,?)`,
          [
            categoryId, row.name, slug, description, price ?? 0, image,
            isDraft ? 0 : 1,
            vatCategory, ageRestricted, preorderHours, seasonMonths, serves,
          ]
        );
        if (isDraft) stats.draft++; else stats.added++;
      }

      // ——— Allergens ———
      const dishRow    = await dbAsync.get('SELECT id FROM dishes WHERE slug = ?', [slug]);
      const dishId     = dishRow.id;
      const allergenList = parseAllergens(row.allergens);

      if (allergenList.length > 0) {
        // Xóa liên kết cũ rồi thêm lại
        await dbAsync.run('DELETE FROM dish_allergens WHERE dish_id = ?', [dishId]);
        for (const tag of allergenList) {
          const allergenSlug = allergenToSlug(tag);
          const allergenId   = allergenMap[allergenSlug];
          if (allergenId) {
            await dbAsync.run(
              'INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_id) VALUES (?, ?)',
              [dishId, allergenId]
            );
          } else {
            issues.push({
              line: row.lineNum, severity: 'WARN',
              msg: `"${row.name}" — allergen không nhận dạng: "${tag}" (slug thử: "${allergenSlug}").`,
            });
          }
        }
      }

    } catch (err) {
      stats.errors.push(`Lỗi upsert "${row.name}": ${err.message}`);
    }
  }

  // ——— In báo cáo ———
  console.log('\n📊 KẾT QUẢ IMPORT:');
  console.log(`   ✅ Thêm mới:   ${stats.added}`);
  console.log(`   🔄 Cập nhật:  ${stats.updated}`);
  console.log(`   📝 Nháp:      ${stats.draft}`);
  console.log(`   ⏭️  Bỏ qua:    ${stats.skipped}`);
  if (stats.errors.length) {
    console.log(`   ❌ Lỗi:       ${stats.errors.length}`);
    stats.errors.forEach(e => console.error('      ', e));
  }

  // ——— Ghi DATA_ISSUES.md ———
  writeDataIssues(issues, stats);
  console.log('\n📄 Đã ghi docs/DATA_ISSUES.md');
  console.log('\n✅ Import hoàn tất.\n');

  process.exit(0);
}

// ——————————————————————————————————————————
// DATA_ISSUES.md
// ——————————————————————————————————————————

function writeDataIssues(issues, stats) {
  const lines = [
    '# DATA_ISSUES — Vị Nhà Mình',
    '',
    `> Sinh tự động bởi \`npm run seed:menu\` lúc ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`,
    '> Đây là các vấn đề dữ liệu cần nhóm xử lý thủ công.',
    '',
    `## Tóm tắt`,
    `- Thêm mới: **${stats.added}** món`,
    `- Cập nhật: **${stats.updated}** món`,
    `- Nháp (thiếu giá): **${stats.draft}** món`,
    `- Bỏ qua: **${stats.skipped}** dòng`,
    `- Lỗi: **${stats.errors.length}**`,
    '',
    '## Danh sách vấn đề',
    '',
    '| Dòng CSV | Mức | Nội dung |',
    '|----------|-----|---------|',
  ];

  for (const issue of issues) {
    const icon = issue.severity === 'SKIP' ? '⛔' :
                 issue.severity === 'DRAFT' ? '📝' :
                 issue.severity === 'WARN' ? '⚠️' : 'ℹ️';
    lines.push(`| ${issue.line} | ${icon} ${issue.severity} | ${issue.msg} |`);
  }

  if (issues.length === 0) {
    lines.push('| — | ✅ | Không có vấn đề nào. |');
  }

  lines.push('');
  lines.push('## Việc cần nhóm làm');
  lines.push('');
  lines.push('1. Bổ sung ảnh thật cho các món thiếu ảnh vào `client/public/images/menu/<tên-file>.jpg`');
  lines.push('2. Xác nhận tên và mô tả các món nháp trước khi mở bán (đặt `is_available=1` trong DB hoặc admin panel)');
  lines.push('3. Kiểm tra các cảnh báo dị ứng (⚠️ WARN) — đặc biệt các món mang mắm/hải sản');
  lines.push('4. `Lẩu thát lát cá bóp` (dòng 66) và `Gỏi gà đồi` (dòng 10) — chỉ có tên, cần bổ sung toàn bộ thông tin');
  lines.push('5. `Hủ tiếu Mỹ Tho` (dòng 57) — thiếu tên trong CSV, đã suy đoán từ tên file ảnh');
  lines.push('6. `Lẩu cá Lăng` (dòng 62) — thiếu mô tả và ảnh; dị ứng ghi "Hải sản (tôm)" nghi sai (cá lăng ≠ tôm)');
  lines.push('');

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

main().catch(err => {
  console.error('❌ Import thất bại:', err);
  process.exit(1);
});
