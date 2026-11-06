/**
 * SCRIPT DỌN DẸP THỰC ĐƠN — VỊ NHÀ MÌNH (PHẦN A1)
 * 
 * Thực hiện:
 * 1. Gộp danh mục trùng: "Thức uống" -> "Đồ uống", "Lẩu & Nướng" -> "Lẩu & Món nước"
 * 2. Giữ lại đúng 28 món chuẩn ẩm thực miền Tây/Nam Bộ đã có ảnh thật:
 *    - Món chính: 10 món
 *    - Khai vị: 5 món
 *    - Lẩu & Món nước: 4 món
 *    - Tráng miệng: 4 món
 *    - Đồ uống: 5 món
 * 3. Bảo vệ toàn vẹn khóa ngoại (FK): Món có trong order_items, reviews thì ẩn (is_available = 0).
 *    Món không liên quan thì xóa an toàn khỏi DB.
 * 4. Cập nhật đường dẫn ảnh nội bộ /public/images/menu/<slug>.jpg
 * 
 * Chạy thử: node server/scripts/cleanMenu.js --dry-run
 * Chạy thật: node server/scripts/cleanMenu.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const isDryRun = process.argv.includes('--dry-run');
const dbPath = path.resolve(__dirname, '../restaurant.sqlite');
const db = new sqlite3.Database(dbPath);

// Danh sách 28 món được chọn giữ lại (10 chính, 5 khai vị, 4 lẩu, 4 tráng miệng, 5 đồ uống)
const KEPT_DISHES_MAP = {
  // --- Món chính (10) ---
  33: { name: 'Cá lóc nướng trui', image: '/public/images/menu/ca-loc-nuong-trui.jpg', cat: 'Món chính' },
  37: { name: 'Cá tai tượng chiên xù', image: '/public/images/menu/ca-tai-tuong-chien-xu.jpg', cat: 'Món chính' },
  35: { name: 'Cá kèo kho tộ nước dừa', image: '/public/images/menu/ca-keo-kho-to-nuoc-dua.jpg', cat: 'Món chính' },
  48: { name: 'Thịt kho tộ nước dừa hột vịt', image: '/public/images/menu/thit-kho-to-nuoc-dua-hot-vit.jpg', cat: 'Món chính' },
  53: { name: 'Cơm tấm sườn bì chả', image: '/public/images/menu/com-tam-suon-bi-cha.jpg', cat: 'Món chính' },
  55: { name: 'Bánh xèo miền Tây củ hũ dừa', image: '/public/images/menu/banh-xeo-mien-tay-cu-hu-dua.jpg', cat: 'Món chính' },
  56: { name: 'Bánh khọt Vũng Tàu', image: '/public/images/menu/banh-khot-vung-tau.jpg', cat: 'Món chính' },
  45: { name: 'Vịt nấu chao', image: '/public/images/menu/vit-nau-chao.jpg', cat: 'Món chính' },
  50: { name: 'Bò nướng lá lốt than hoa', image: '/public/images/menu/bo-nuong-la-lot-than-hoa.jpg', cat: 'Món chính' },
  39: { name: 'Tôm nướng muối ớt', image: '/public/images/menu/tom-cang-xanh-nuong-muoi-ot.jpg', cat: 'Món chính' },

  // --- Khai vị (5) ---
  5:  { name: 'Gỏi ngó sen tôm thịt', image: '/public/images/menu/goi-ngo-sen-tom-thit.jpg', cat: 'Khai vị' },
  28: { name: 'Gỏi cuốn tôm thịt', image: '/public/images/menu/goi-cuon-tom-thit.jpg', cat: 'Khai vị' },
  29: { name: 'Chạo tôm bọc mía nướng', image: '/public/images/menu/chao-tom-boc-mia-nuong.jpg', cat: 'Khai vị' },
  31: { name: 'Khô cá sặc rằn nướng mắm me', image: '/public/images/menu/kho-ca-sac-ran-nuong-mam-me.jpg', cat: 'Khai vị' },
  21: { name: 'Nghêu hấp sả ớt', image: '/public/images/menu/ngheu-hap-sa-ot.jpg', cat: 'Khai vị' },

  // --- Lẩu & Món nước (4) ---
  70: { name: 'Canh chua cá lóc', image: '/public/images/menu/canh-chua-ca-loc.jpg', cat: 'Lẩu & Món nước' },
  59: { name: 'Hủ tiếu Nam Vang', image: '/public/images/menu/hu-tieu-nam-vang.jpg', cat: 'Lẩu & Món nước' },
  60: { name: 'Bún mắm Sóc Trăng', image: '/public/images/menu/bun-mam-soc-trang.jpg', cat: 'Lẩu & Món nước' },
  75: { name: 'Bò kho bánh mì', image: '/public/images/menu/bo-kho-banh-mi.jpg', cat: 'Lẩu & Món nước' },

  // --- Tráng miệng (4) ---
  80: { name: 'Chè bà ba', image: '/public/images/menu/che-ba-ba.jpg', cat: 'Tráng miệng' },
  88: { name: 'Bánh da lợn lá dứa', image: '/public/images/menu/banh-da-lon-la-dua.jpg', cat: 'Tráng miệng' },
  77: { name: 'Chè chuối nướng nước cốt dừa', image: '/public/images/menu/che-chuoi-nuong-nuoc-cot-dua.jpg', cat: 'Tráng miệng' },
  76: { name: 'Chè bưởi Bến Tre', image: '/public/images/menu/che-buoi-ben-tre.jpg', cat: 'Tráng miệng' },

  // --- Đồ uống (5) ---
  95: { name: 'Cà phê sữa đá', image: '/public/images/menu/ca-phe-sua-da.jpg', cat: 'Đồ uống' },
  92: { name: 'Nước mía tắc Sài Gòn', image: '/public/images/menu/nuoc-mia-tac-sai-gon.jpg', cat: 'Đồ uống' },
  3:  { name: 'Trà đào cam sả đá tuyết', image: '/public/images/menu/tra-dao-cam-sa.jpg', cat: 'Đồ uống' },
  91: { name: 'Nước dừa xiêm Bến Tre', image: '/public/images/menu/nuoc-dua-xiem-ben-tre.jpg', cat: 'Đồ uống' },
  99: { name: 'Rượu đế Gò Đen', image: '/public/images/menu/ruou-de-go-den.jpg', cat: 'Đồ uống' }
};

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runExec(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function cleanMenu() {
  console.log(`\n======================================================`);
  console.log(`   DỌN DẸP THỰC ĐƠN VỊ NHÀ MÌNH ${isDryRun ? '[CHẾ ĐỘ --DRY-RUN]' : '[CHẾ ĐỘ THỰC THI THẬT]'}`);
  console.log(`======================================================\n`);

  // 1. Thống kê trước khi dọn dẹp
  const allDishesBefore = await runQuery('SELECT d.id, d.name, d.category_id, c.name as category_name FROM dishes d LEFT JOIN categories c ON d.category_id = c.id');
  const allCategoriesBefore = await runQuery('SELECT * FROM categories');

  console.log(`📊 Hiện trạng ban đầu:`);
  console.log(`   - Tổng số món ăn: ${allDishesBefore.length}`);
  console.log(`   - Danh mục: ${allCategoriesBefore.map(c => `"${c.name}" (id:${c.id})`).join(', ')}\n`);

  // 2. Tìm ID danh mục chuẩn
  let catKhaiVi = allCategoriesBefore.find(c => c.name === 'Khai vị')?.id || 1;
  let catMonChinh = allCategoriesBefore.find(c => c.name === 'Món chính')?.id || 2;
  let catMonNuoc = allCategoriesBefore.find(c => c.name === 'Lẩu & Món nước')?.id || 8;
  let catTrangMieng = allCategoriesBefore.find(c => c.name === 'Tráng miệng')?.id || 4;
  let catDoUong = allCategoriesBefore.find(c => c.name === 'Đồ uống')?.id || 5;

  const targetCatIds = {
    'Khai vị': catKhaiVi,
    'Món chính': catMonChinh,
    'Lẩu & Món nước': catMonNuoc,
    'Tráng miệng': catTrangMieng,
    'Đồ uống': catDoUong
  };

  // 3. Phân loại món giữ lại và món cần dọn dẹp
  const referencedOrders = await runQuery('SELECT DISTINCT dish_id FROM order_items WHERE dish_id IS NOT NULL');
  const referencedReviews = await runQuery('SELECT DISTINCT dish_id FROM reviews WHERE dish_id IS NOT NULL');
  const referencedCarts = await runQuery('SELECT DISTINCT dish_id FROM cart_items WHERE dish_id IS NOT NULL');

  const fkReferencedSet = new Set([
    ...referencedOrders.map(r => r.dish_id),
    ...referencedReviews.map(r => r.dish_id),
    ...referencedCarts.map(r => r.dish_id)
  ]);

  const toKeepIds = Object.keys(KEPT_DISHES_MAP).map(Number);
  const toDeleteIds = [];
  const toHideIds = [];

  for (const dish of allDishesBefore) {
    if (toKeepIds.includes(dish.id)) {
      continue;
    }
    if (fkReferencedSet.has(dish.id)) {
      toHideIds.push(dish);
    } else {
      toDeleteIds.push(dish);
    }
  }

  console.log(`📋 Kế hoạch xử lý:`);
  console.log(`   - Giữ lại: ${toKeepIds.length} món (chuẩn 100% ẩm thực miền Tây/Nam Bộ, có ảnh thật)`);
  console.log(`   - Ẩn (is_available = 0 để an toàn FK): ${toHideIds.length} món (${toHideIds.map(d => `[id:${d.id}] ${d.name}`).join(', ')})`);
  console.log(`   - Xóa an toàn: ${toDeleteIds.length} món\n`);

  if (isDryRun) {
    console.log(`[DRY-RUN] Danh sách 28 món sẽ được kích hoạt và cập nhật ảnh:`);
    for (const [id, info] of Object.entries(KEPT_DISHES_MAP)) {
      console.log(`   • [id:${id}] ${info.name} (${info.cat}) -> ${info.image}`);
    }
    console.log(`\n[DRY-RUN] Hoàn tất in thử nghiệm. Dùng không có flag --dry-run để áp dụng vào DB.`);
    db.close();
    return;
  }

  // Bắt đầu thực thi trong Transaction
  await runExec('BEGIN TRANSACTION');

  try {
    // A. Gộp danh mục:
    // "Thức uống" (id: 10) -> "Đồ uống" (catDoUong)
    // "Lẩu & Nướng" (id: 3) -> "Lẩu & Món nước" (catMonNuoc)
    await runExec('UPDATE dishes SET category_id = ? WHERE category_id IN (SELECT id FROM categories WHERE name = "Thức uống")', [catDoUong]);
    await runExec('UPDATE dishes SET category_id = ? WHERE category_id IN (SELECT id FROM categories WHERE name = "Lẩu & Nướng")', [catMonNuoc]);

    // Chuẩn hóa tên và slug của "Lẩu & Món nước"
    await runExec('UPDATE categories SET name = "Lẩu & Món nước", slug = "mon-nuoc", sort_order = 3 WHERE id = ?', [catMonNuoc]);
    await runExec('UPDATE categories SET sort_order = 5 WHERE id = ?', [catDoUong]);

    // B. Cập nhật 28 món giữ lại
    for (const [idStr, info] of Object.entries(KEPT_DISHES_MAP)) {
      const id = Number(idStr);
      const catId = targetCatIds[info.cat];
      await runExec(`UPDATE dishes SET 
        category_id = ?, 
        image = ?, 
        is_available = 1 
        WHERE id = ?`, [catId, info.image, id]);
    }

    // C. Ẩn các món có liên quan đến FK (order_items, reviews)
    for (const d of toHideIds) {
      await runExec('UPDATE dishes SET is_available = 0 WHERE id = ?', [d.id]);
    }

    // D. Xóa an toàn các món không còn dùng và không có ràng buộc FK
    for (const d of toDeleteIds) {
      await runExec('DELETE FROM dish_allergens WHERE dish_id = ?', [d.id]);
      await runExec('DELETE FROM dish_toppings WHERE dish_id = ?', [d.id]);
      await runExec('DELETE FROM dish_ingredients WHERE dish_id = ?', [d.id]);
      await runExec('DELETE FROM dishes WHERE id = ?', [d.id]);
    }

    // E. Xóa các danh mục rỗng (Thức uống id 10, Lẩu & Nướng id 3)
    await runExec('DELETE FROM categories WHERE name IN ("Thức uống", "Lẩu & Nướng") AND id NOT IN (SELECT DISTINCT category_id FROM dishes WHERE is_available = 1)');

    await runExec('COMMIT');
    console.log(`✅ Đã áp dụng các thay đổi vào Database thành công!`);
  } catch (err) {
    await runExec('ROLLBACK');
    console.error(`❌ Lỗi khi thực thi: ${err.message}. Đã rollback transaction.`);
    db.close();
    process.exit(1);
  }

  // 4. Thống kê sau khi dọn dẹp
  const activeDishesAfter = await runQuery(`SELECT d.id, d.name, d.image, c.name as category_name 
    FROM dishes d 
    JOIN categories c ON d.category_id = c.id 
    WHERE d.is_available = 1 
    ORDER BY c.sort_order, d.id`);

  const activeCategoriesAfter = await runQuery('SELECT * FROM categories ORDER BY sort_order');

  const catCounts = {};
  activeDishesAfter.forEach(d => {
    catCounts[d.category_name] = (catCounts[d.category_name] || 0) + 1;
  });

  console.log(`\n================ BÁO CÁO KẾT QUẢ DỌN DẸP ================`);
  console.log(`Số món đang phục vụ (is_available = 1): ${activeDishesAfter.length} món`);
  console.log(`Phân bổ theo danh mục:`);
  for (const [cName, count] of Object.entries(catCounts)) {
    console.log(`   - ${cName}: ${count} món`);
  }
  console.log(`Danh mục hiện có (${activeCategoriesAfter.length}): ${activeCategoriesAfter.map(c => `"${c.name}"`).join(', ')}`);
  console.log(`Tất cả ${activeDishesAfter.length} món đều trỏ tới ảnh nội bộ /public/images/menu/...`);
  console.log(`=========================================================\n`);

  db.close();
}

cleanMenu().catch(err => {
  console.error(err);
  db.close();
  process.exit(1);
});
