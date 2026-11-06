const seedLog = (...args) => { if (!process.env.NODE_TEST_CONTEXT) console.log(...args); };
/**
 * SEED DATA — VỊ NHÀ MÌNH
 * Khởi tạo: Tài khoản demo, Danh mục, Bàn ăn, Voucher, Kho nguyên liệu, Đơn hàng mẫu
 * Món ăn thật được import qua `npm run seed:menu` từ server/seeds/menu.csv
 */

const bcrypt = require('bcryptjs');
const { dbAsync } = require('../config/db');

async function seedDatabase() {
  try {
    // 1. Tạo tài khoản mẫu
    const userCount = await dbAsync.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      seedLog('🌱 Đang tạo tài khoản mẫu...');
      const salt = await bcrypt.genSalt(10);
      const adminPass = await bcrypt.hash('Admin@1234', salt);
      const staffPass = await bcrypt.hash('Staff@1234', salt);
      const custPass = await bcrypt.hash('Khach@1234', salt);

      await dbAsync.run(
        `INSERT INTO users (name, email, password, phone, role, loyalty_points) VALUES 
         ('Quản Trị Viên', 'admin@vinhaminh.vn', ?, '0901234567', 'admin', 500),
         ('Nhân Viên Phục Vụ', 'staff@vinhaminh.vn', ?, '0912345678', 'staff', 100),
         ('Trần Thị Khách Quen', 'khach@gmail.com', ?, '0987654321', 'customer', 120)`,
        [adminPass, staffPass, custPass]
      );
    }

    // 2. Tạo danh mục mẫu
    const catCount = await dbAsync.get('SELECT COUNT(*) as count FROM categories');
    if (catCount.count === 0) {
      seedLog('🌱 Đang tạo danh mục món ăn...');
      await dbAsync.run(
        `INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
         ('Khai vị', 'khai-vi', '🥗', 'Các món nhẹ kích thích vị giác đầu bữa', 1),
         ('Món chính', 'mon-chinh', '🥩', 'Các món ăn hảo hạng chuẩn phong vị ẩm thực', 2),
         ('Lẩu & Món nước', 'mon-nuoc', '🍲', 'Đậm đà hương vị sum vầy cùng gia đình', 3),
         ('Tráng miệng', 'trang-mieng', '🍨', 'Ngọt ngào thanh mát khép lại bữa tiệc hoàn hảo', 4),
         ('Đồ uống', 'do-uong', '🍹', 'Nước ép trái cây tươi, cocktail & rượu vang thượng hạng', 5)`
      );
    }

    // 3. Tạo món mẫu
    const dishCount = await dbAsync.get('SELECT COUNT(*) as count FROM dishes');
    if (dishCount.count === 0) {
      seedLog('🌱 Đang tạo món ăn mẫu...');
      const catMain = await dbAsync.get("SELECT id FROM categories WHERE slug = 'mon-chinh'");
      const catApp = await dbAsync.get("SELECT id FROM categories WHERE slug = 'khai-vi'");
      const catDrink = await dbAsync.get("SELECT id FROM categories WHERE slug = 'do-uong'");

      const d1 = await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Thăn Bò Wagyu A5 Sốt Tiêu Đen', 'than-bo-wagyu-a5', 'Thịt bò Wagyu vân mỡ cẩm thạch tuyệt hảo, áp chảo mềm tan kèm sốt tiêu Phú Quốc đậm đà và khoai tây nướng thảo mộc.', 385000, 450000, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80', 3, 1, 1, 1, 'halal', 20, 4.9, 38)`,
        [catMain ? catMain.id : 1]
      );
      await dbAsync.run(`INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, 'Thêm Sốt Phô Mai Nóng Chảy', 25000), (?, 'Thêm Nấm Truffle Đen', 45000), (?, 'Bánh Mì Bơ Tỏi', 15000)`, [d1.id, d1.id, d1.id]);

      const d2 = await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Salad Cá Hồi Nauy Sốt Chanh Leo', 'salad-ca-hoi-nauy', 'Phi lê cá hồi Nauy tươi ngon kết hợp xà lách Romaine hữu cơ, quả bơ béo ngậy và sốt chanh dây chua ngọt tươi mát.', 145000, 160000, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80', 1, 1, 1, 0, 'gluten-free', 10, 4.8, 25)`,
        [catApp ? catApp.id : 1]
      );
      await dbAsync.run(`INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, 'Thêm Trứng Lòng Đào', 12000), (?, 'Gấp Đôi Cá Hồi', 45000)`, [d2.id, d2.id]);

      await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Trà Đào Cam Sả Đá Tuyết', 'tra-dao-cam-sa', 'Hương vị thanh mát từ trà ô long thượng hạng, đào miếng giòn ngọt kết hợp tinh dầu sả tươi và lát cam vàng mọng nước.', 55000, 65000, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80', 0, 1, 0, 1, 'vegetarian', 5, 5.0, 14)`,
        [catDrink ? catDrink.id : 1]
      );

      // Nạp thêm các món ăn mới đa dạng
      const catHotpot = await dbAsync.get("SELECT id FROM categories WHERE slug = 'lau-va-nuong'");
      const catDessert = await dbAsync.get("SELECT id FROM categories WHERE slug = 'trang-mieng'");

      const d4 = await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Soup Bào Ngư Vi Cá Thượng Hạng', 'soup-bao-ngu-vi-ca', 'Nước dùng ninh từ xương gà tre và thảo mộc trong 12 tiếng, bào ngư tươi giòn sần sật và nấm đông cô thơm lừng.', 185000, 210000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=80', 2, 1, 1, 1, 'seafood', 12, 4.9, 19)`,
        [catApp ? catApp.id : 1]
      );
      await dbAsync.run(`INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, 'Nấm Tuyết Giòn', 15000), (?, 'Bào Ngư Mini', 45000)`, [d4.id, d4.id]);

      const d5 = await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Sườn Cừu Nướng Hương Thảo Sốt Vang', 'suon-cuu-nuong-huong-thao', 'Sườn cừu non New Zealand nướng chín tới mọng nước, tẩm ướp lá hương thảo và chấm sốt vang đỏ Bordeaux.', 345000, 390000, 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=80', 2, 1, 1, 0, 'halal', 25, 5.0, 42)`,
        [catMain ? catMain.id : 2]
      );
      await dbAsync.run(`INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, 'Khoai Tây Nghiền Pháp', 20000), (?, 'Rau Củ Nướng Bơ Tỏi', 25000)`, [d5.id, d5.id]);

      const d6 = await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Lẩu Thái Tom Yum Hải Sản Chua Cay', 'lau-thai-tom-yum-hai-san', 'Nước lẩu cốt dừa béo thơm, sả riềng cay nồng. Set gồm mực trứng, tôm càng, bò Mỹ và nấm tươi.', 360000, 420000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80', 4, 1, 1, 0, 'seafood,spicy', 20, 4.9, 56)`,
        [catHotpot ? catHotpot.id : 3]
      );
      await dbAsync.run(`INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, 'Mì Ramen Nhật Bản', 18000), (?, 'Đĩa Ba Chỉ Bò Thêm', 65000)`, [d6.id, d6.id]);

      const d7 = await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Bánh Mousse Socola Bỉ Dung Nham', 'banh-mousse-socola-bi', 'Vỏ bánh mềm xốp bao trọn dòng socola đen 70% Bỉ ấm nóng tan chảy, ăn kèm viên kem vani Madagascar.', 75000, 90000, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80', 0, 1, 1, 0, 'vegetarian', 8, 5.0, 29)`,
        [catDessert ? catDessert.id : 4]
      );
      await dbAsync.run(`INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, 'Thêm Viên Kem Vani', 18000), (?, 'Dâu Tây Đà Lạt', 15000)`, [d7.id, d7.id]);

      const d8 = await dbAsync.run(
        `INSERT INTO dishes (category_id, name, slug, description, price, original_price, image, spice_levels_allowed, is_available, is_featured, is_new, dietary_tags, prep_minutes, rating_avg, rating_count)
         VALUES (?, 'Cocktail Hoàng Hôn Nhiệt Đới', 'cocktail-passion-sunset', 'Sự pha trộn sảng khoái giữa rượu Gin hoa hồng, chanh dây tươi và siro dâu rừng tạo tầng màu tuyệt đẹp.', 95000, 115000, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80', 0, 1, 1, 1, 'beverage', 5, 4.9, 31)`,
        [catDrink ? catDrink.id : 5]
      );
      await dbAsync.run(`INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, 'Extra Shot Rượu Nền', 30000), (?, 'Thạch Trái Cây', 10000)`, [d8.id, d8.id]);
    }

    // 4. Tạo Bàn ăn mẫu & Mã QR bàn (Mục 10)
    const tableCount = await dbAsync.get('SELECT COUNT(*) as count FROM tables');
    if (tableCount.count === 0) {
      seedLog('🌱 Đang tạo sơ đồ bàn ăn...');
      const initialTables = [
        ['Bàn 01', 2, 'Tầng 1', 'empty', 'TB-01'],
        ['Bàn 02', 4, 'Tầng 1', 'occupied', 'TB-02'],
        ['Bàn 03', 4, 'Tầng 1', 'empty', 'TB-03'],
        ['Bàn 04', 6, 'Tầng 1', 'reserved', 'TB-04'],
        ['Bàn VIP 01', 8, 'Tầng 2 (VIP)', 'empty', 'VIP-01'],
        ['Bàn VIP 02', 12, 'Tầng 2 (VIP)', 'occupied', 'VIP-02'],
        ['Sân Vườn 01', 4, 'Sân vườn ngoài trời', 'cleaning', 'SV-01'],
        ['Sân Vườn 02', 6, 'Sân vườn ngoài trời', 'empty', 'SV-02']
      ];

      for (let t of initialTables) {
        await dbAsync.run(
          `INSERT INTO tables (table_number, capacity, area, status, qr_token) VALUES (?, ?, ?, ?, ?)`,
          t
        );
      }
    }

    // 5. Tạo Vouchers khuyến mãi (Mục 6)
    const voucherCount = await dbAsync.get('SELECT COUNT(*) as count FROM vouchers');
    if (voucherCount.count === 0) {
      seedLog('🌱 Đang tạo vouchers mẫu...');
      await dbAsync.run(
        `INSERT INTO vouchers (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, min_tier) VALUES
         ('WELCOME50', 'Giảm trực tiếp 50.000đ cho đơn hàng từ 200.000đ', 'fixed', 50000, 200000, 50000, 100, 'Đồng'),
         ('VIP10', 'Giảm 10% tối đa 80.000đ cho khách hàng thân thiết', 'percent', 10, 300000, 80000, 50, 'Bạc'),
         ('VINHAMINH', 'Ưu đãi trải nghiệm giảm 20.000đ cho mọi đơn', 'fixed', 20000, 100000, 20000, 200, 'Đồng')`
      );
    }

    // 6. Tạo Kho nguyên liệu mẫu (Mục 15)
    const ingCount = await dbAsync.get('SELECT COUNT(*) as count FROM ingredients');
    if (ingCount.count === 0) {
      seedLog('🌱 Đang tạo nguyên liệu kho...');
      await dbAsync.run(
        `INSERT INTO ingredients (name, unit, quantity, min_threshold, cost_per_unit) VALUES
         ('Thịt Bò Wagyu A5', 'kg', 18.5, 5.0, 1200000),
         ('Cá Hồi Tươi Nauy', 'kg', 3.2, 5.0, 480000),     -- Tồn thấp báo động đỏ
         ('Phô Mai Mozzarella', 'kg', 12.0, 3.0, 190000),
         ('Rau Xà Lách Hữu Cơ', 'kg', 2.0, 4.0, 45000),     -- Tồn thấp báo động đỏ
         ('Nấm Truffle Đen', 'hộp', 8.0, 2.0, 850000),
         ('Đào Miếng Ngâm Đường', 'hộp', 24.0, 6.0, 68000)`
      );
    }

    // 7. Tạo Đơn hàng mẫu (Mục 7, 8, 9, 16)
    const orderCount = await dbAsync.get('SELECT COUNT(*) as count FROM orders');
    if (orderCount.count === 0) {
      seedLog('🌱 Đang tạo đơn hàng mẫu cho Bếp & Doanh thu...');
      const order1 = await dbAsync.run(
        `INSERT INTO orders (order_code, user_id, table_id, order_type, customer_name, customer_phone, subtotal, discount_amount, vat_amount, total_amount, payment_method, payment_status, status, estimated_minutes)
         VALUES ('ORD-8821', 3, 2, 'dine_in', 'Trần Thị Khách Quen', '0987654321', 530000, 50000, 38400, 518400, 'qr_pay', 'paid', 'cooking', 15)`
      );
      await dbAsync.run(
        `INSERT INTO order_items (order_id, dish_name, dish_price, quantity, spice_level, selected_toppings, note, item_total)
         VALUES (?, 'Thăn Bò Wagyu A5 Sốt Tiêu Đen', 385000, 1, 2, '[{"name":"Thêm Sốt Phô Mai Nóng Chảy","price":25000}]', 'Làm chín vừa (Medium rare)', 410000),
                (?, 'Salad Cá Hồi Nauy Sốt Chanh Leo', 145000, 1, 0, '[]', 'Để riêng sốt', 145000)`,
        [order1.id, order1.id]
      );

      const order2 = await dbAsync.run(
        `INSERT INTO orders (order_code, user_id, order_type, customer_name, customer_phone, delivery_address, subtotal, discount_amount, vat_amount, total_amount, payment_method, payment_status, status, estimated_minutes, shipper_name)
         VALUES ('ORD-9932', 3, 'delivery', 'Lê Hoàng Nam', '0933221100', '15 Lê Lợi, Phường Bến Nghé, Quận 1', 200000, 0, 16000, 216000, 'cash', 'unpaid', 'serving', 25, 'Nguyễn Văn Giao Hàng')`
      );
      await dbAsync.run(
        `INSERT INTO order_items (order_id, dish_name, dish_price, quantity, spice_level, item_total)
         VALUES (?, 'Salad Cá Hồi Nauy Sốt Chanh Leo', 145000, 1, 0, 145000),
                (?, 'Trà Đào Cam Sả Đá Tuyết', 55000, 1, 0, 55000)`,
        [order2.id, order2.id]
      );
    }

    // 8. Tạo Đánh giá mẫu (Mục 13)
    const reviewCount = await dbAsync.get('SELECT COUNT(*) as count FROM reviews');
    if (reviewCount.count === 0) {
      await dbAsync.run(
        `INSERT INTO reviews (user_id, dish_id, customer_name, rating, comment, is_approved) VALUES
         (3, 1, 'Trần Thị Khách Quen', 5, 'Bò Wagyu thơm mềm tan trong miệng, sốt tiêu đen rất vừa vặn!', 1),
         (3, 2, 'Trần Thị Khách Quen', 5, 'Cá hồi tươi rói, sốt chanh leo chua thanh cực kỳ ấn tượng!', 1)`
      );
    }

    seedLog('✅ Dữ liệu mẫu Vị Nhà Mình đã sẵn sàng!');
  } catch (err) {
    console.error('❌ Lỗi seed database:', err);
  }
}

module.exports = { seedDatabase };
