/**
 * DATABASE CONFIGURATION — VỊ NHÀ MÌNH
 * SQLite3 với migration có version.
 * Thêm bảng/cột mới: tạo file mới trong server/migrations/.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'restaurant.sqlite');
const IS_TEST = Boolean(process.env.NODE_TEST_CONTEXT);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối CSDL SQLite:', err.message);
  } else if (!IS_TEST) {
    console.log('✅ Đã kết nối thành công tới SQLite Database tại:', DB_PATH);
  }
});

db.run('PRAGMA foreign_keys = ON');

const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  // Tạo bảng theo dõi migration nếu chưa có
  await dbAsync.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Lấy danh sách migration đã chạy
  const applied = await dbAsync.all('SELECT version FROM schema_migrations');
  const appliedSet = new Set(applied.map(r => r.version));

  // Đọc tất cả file .sql trong thư mục migrations, sắp xếp theo tên
  let files = [];
  try {
    files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch {
    // Thư mục chưa có migration nào — bỏ qua
    return;
  }

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => { if (err) return reject(err); });
        db.exec(sql, (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(new Error(`Migration ${file} thất bại: ${err.message}`));
          }
          db.run(
            'INSERT INTO schema_migrations (version) VALUES (?)',
            [file],
            (err2) => {
              if (err2) { db.run('ROLLBACK'); return reject(err2); }
              db.run('COMMIT', (err3) => {
                if (err3) return reject(err3);
                if (!IS_TEST) console.log(`✅ Migration áp dụng: ${file}`);
                resolve();
              });
            }
          );
        });
      });
    });
  }
}

async function initDatabase() {
  // Chạy migration có version trước
  await runMigrations();

  const schemaSQL = `
    -- 1. Bảng Người dùng
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'staff', 'admin')),
      avatar TEXT,
      loyalty_points INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Bảng Danh mục
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Bảng Món ăn
    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL CHECK(price >= 0),
      original_price REAL DEFAULT 0,
      image TEXT,
      spice_levels_allowed INTEGER DEFAULT 4,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      is_new INTEGER DEFAULT 0,
      dietary_tags TEXT,
      prep_minutes INTEGER DEFAULT 15,
      rating_avg REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    -- 4. Bảng Topping món
    CREATE TABLE IF NOT EXISTS dish_toppings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
    );

    -- 5. Bảng Giỏ hàng
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      session_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      spice_level INTEGER DEFAULT 0,
      selected_toppings TEXT,
      note TEXT,
      unit_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
    );

    -- 6. Bảng Voucher Khuyến mãi (Mục 6)
    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percent', 'fixed')),
      discount_value REAL NOT NULL,
      min_order_value REAL DEFAULT 0,
      max_discount REAL DEFAULT 0,
      usage_limit INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      min_tier TEXT DEFAULT 'Đồng',
      start_date DATE,
      end_date DATE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Bảng Bàn ăn & Sơ đồ bàn (Mục 10)
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      area TEXT DEFAULT 'Tầng 1' CHECK(area IN ('Tầng 1', 'Tầng 2 (VIP)', 'Sân vườn ngoài trời')),
      status TEXT DEFAULT 'empty' CHECK(status IN ('empty', 'occupied', 'reserved', 'cleaning')),
      current_order_id INTEGER,
      qr_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Bảng Đơn hàng (Mục 7, 8, 9)
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      table_id INTEGER,
      order_type TEXT NOT NULL CHECK(order_type IN ('dine_in', 'takeaway', 'delivery')),
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      voucher_code TEXT,
      vat_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'qr_pay', 'sandbox_card')),
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid')),
      status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'cooking', 'ready', 'serving', 'completed', 'cancelled')),
      cancel_reason TEXT,
      estimated_minutes INTEGER DEFAULT 20,
      shipper_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
    );

    -- 9. Bảng Chi tiết Đơn hàng
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      dish_id INTEGER,
      dish_name TEXT NOT NULL,
      dish_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      spice_level INTEGER DEFAULT 0,
      selected_toppings TEXT,
      note TEXT,
      item_total REAL NOT NULL,
      item_status TEXT DEFAULT 'received',
      status_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- 10. Bảng Đặt bàn / Đặt tiệc (Mục 11)
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      guest_count INTEGER NOT NULL,
      reservation_time DATETIME NOT NULL,
      area TEXT DEFAULT 'Tầng 1',
      party_type TEXT DEFAULT 'normal' CHECK(party_type IN ('normal', 'birthday', 'corporate', 'wedding')),
      special_request TEXT,
      deposit_amount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
      table_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
    );

    -- 11. Bảng Đánh giá món ăn (Mục 13)
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      is_approved INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
    );

    -- 12. Bảng Tin nhắn Chat Hỗ trợ (Mục 14)
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Bảng Kho & Nguyên liệu (Mục 15)
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      min_threshold REAL NOT NULL DEFAULT 10,
      cost_per_unit REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 14. Bảng Định lượng món (Công thức trừ kho)
    CREATE TABLE IF NOT EXISTS dish_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      amount_needed REAL NOT NULL,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    -- 15. Bảng Lịch sử Kho
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      change_amount REAL NOT NULL,
      action_type TEXT NOT NULL, -- 'import', 'export', 'order_deduct'
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    -- Index hỗ trợ tốc độ cao
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
    CREATE INDEX IF NOT EXISTS idx_reservations_time ON reservations(reservation_time);
  `;

  await dbAsync.exec(schemaSQL);

  // Đảm bảo cột is_locked tồn tại trong users nếu CSDL cũ chưa có
  try {
    await dbAsync.run('ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0');
  } catch (err) {
    // Cột đã tồn tại
  }

  if (!IS_TEST) console.log('✅ Database Vị Nhà Mình đã sẵn sàng.');
}

module.exports = {
  db,
  dbAsync,
  initDatabase,
  runMigrations,
};
