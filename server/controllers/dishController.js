/**
 * DISH CONTROLLER (Mục 2: Admin quản lý món, Mục 3: Xem thực đơn, Mục 4: Chi tiết món & options)
 * Áp dụng skills: backend-development-feature-development, sql-pro, api-design-principles
 */

const { dbAsync } = require('../config/db');

const DEFAULT_PLACEHOLDER = '/public/images/menu/placeholder.svg';

/**
 * Kiểm tra hợp lệ của URL ảnh:
 * Chỉ chấp nhận http://, https:// hoặc đường dẫn nội bộ /public/images/
 * Chặn hoàn toàn javascript:, data: và các giao thức lạ.
 */
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('/public/images/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 1. LẤY DANH SÁCH THỰC ĐƠN (Mục 3: Tìm kiếm, lọc danh mục, sắp xếp giá)
 */
async function getDishes(req, res, next) {
  try {
    const {
      search,
      category_id,
      sort,
      featured,
      dietary,
      include_unavailable // Dùng cho Admin xem toàn bộ
    } = req.query;

    let sql = `
      SELECT d.*, c.name as category_name, c.slug as category_slug
      FROM dishes d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Chỉ lấy món còn hàng nếu không phải truy vấn đặc biệt từ Admin
    if (include_unavailable !== 'true') {
      sql += ' AND d.is_available = 1';
    }

    // Lọc theo danh mục
    if (category_id && category_id !== 'all') {
      sql += ' AND d.category_id = ?';
      params.push(category_id);
    }

    // Tìm kiếm từ khóa (tên món hoặc mô tả)
    if (search && search.trim() !== '') {
      sql += ' AND (d.name LIKE ? OR d.description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Lọc món nổi bật / bán chạy
    if (featured === 'true') {
      sql += ' AND d.is_featured = 1';
    }

    // Lọc theo chế độ ăn (vegetarian, spicy, etc.)
    if (dietary) {
      sql += ' AND d.dietary_tags LIKE ?';
      params.push(`%${dietary}%`);
    }

    // Sắp xếp
    switch (sort) {
      case 'price_asc':
        sql += ' ORDER BY d.price ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY d.price DESC';
        break;
      case 'popular':
        sql += ' ORDER BY d.is_featured DESC, d.rating_avg DESC';
        break;
      case 'newest':
        sql += ' ORDER BY d.is_new DESC, d.created_at DESC';
        break;
      default:
        sql += ' ORDER BY d.is_featured DESC, d.id DESC';
    }

    const dishes = await dbAsync.all(sql, params);

    res.json({
      success: true,
      data: dishes,
      total: dishes.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. LẤY CHI TIẾT MÓN ĂN KÈM OPTIONS & TOPPINGS (Mục 4: Chi tiết món)
 */
async function getDishById(req, res, next) {
  try {
    const { id } = req.params;

    const dish = await dbAsync.get(
      `SELECT d.*, c.name as category_name, c.slug as category_slug
       FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       WHERE d.id = ?`,
      [id]
    );

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy món ăn yêu cầu.'
      });
    }

    // Lấy danh sách Topping riêng của món và Topping chung (dish_id IS NULL)
    const toppings = await dbAsync.all(
      `SELECT id, name, price, is_available 
       FROM dish_toppings 
       WHERE (dish_id = ? OR dish_id IS NULL) AND is_available = 1
       ORDER BY price ASC`,
      [dish.id]
    );

    // Lấy danh sách món gợi ý ăn kèm (cùng danh mục hoặc món nổi bật)
    const relatedDishes = await dbAsync.all(
      `SELECT id, name, price, image, is_featured, rating_avg 
       FROM dishes 
       WHERE id != ? AND (category_id = ? OR is_featured = 1) AND is_available = 1
       LIMIT 4`,
      [dish.id, dish.category_id]
    );

    res.json({
      success: true,
      data: {
        ...dish,
        toppings,
        relatedDishes
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. THÊM MÓN ĂN MỚI (Mục 2: Admin Quản lý món)
 */
async function createDish(req, res, next) {
  try {
    const {
      category_id,
      name,
      description,
      price,
      original_price,
      image,
      spice_levels_allowed,
      is_available,
      is_featured,
      is_new,
      dietary_tags,
      prep_minutes,
      toppings // Mảng [{ name, price }]
    } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp danh mục, tên món và giá tiền.'
      });
    }

    if (parseFloat(price) < 0 || (original_price !== undefined && parseFloat(original_price) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Giá món ăn không thể là số âm.'
      });
    }

    let finalImage = DEFAULT_PLACEHOLDER;
    if (image && typeof image === 'string' && image.trim() !== '') {
      const trimmedImg = image.trim();
      if (!isValidImageUrl(trimmedImg)) {
        return res.status(400).json({
          success: false,
          message: 'Đường dẫn ảnh không hợp lệ. Vui lòng nhập URL bắt đầu bằng http://, https:// hoặc /public/images/.'
        });
      }
      finalImage = trimmedImg;
    }

    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') + '-' + Date.now();

    const result = await dbAsync.run(
      `INSERT INTO dishes (
        category_id, name, slug, description, price, original_price, 
        image, spice_levels_allowed, is_available, is_featured, is_new,
        dietary_tags, prep_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        name.trim(),
        slug,
        description || '',
        parseFloat(price) || 0,
        parseFloat(original_price) || 0,
        finalImage,
        spice_levels_allowed !== undefined ? parseInt(spice_levels_allowed) : 4,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
        is_featured ? 1 : 0,
        is_new ? 1 : 0,
        dietary_tags || '',
        prep_minutes || 15
      ]
    );

    const dishId = result.id;

    // Lưu các topping đi kèm (nếu có)
    if (Array.isArray(toppings) && toppings.length > 0) {
      for (let t of toppings) {
        if (t.name && t.name.trim() !== '') {
          await dbAsync.run(
            'INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, ?, ?)',
            [dishId, t.name.trim(), parseFloat(t.price) || 0]
          );
        }
      }
    }

    const createdDish = await dbAsync.get('SELECT * FROM dishes WHERE id = ?', [dishId]);

    res.status(201).json({
      success: true,
      message: 'Đã thêm món ăn mới vào thực đơn thành công!',
      data: createdDish
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. CẬP NHẬT MÓN ĂN (Mục 2: Admin Quản lý món)
 */
async function updateDish(req, res, next) {
  try {
    const { id } = req.params;
    const {
      category_id,
      name,
      description,
      price,
      original_price,
      image,
      spice_levels_allowed,
      is_available,
      is_featured,
      is_new,
      dietary_tags,
      prep_minutes,
      toppings
    } = req.body;

    const existing = await dbAsync.get('SELECT * FROM dishes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy món ăn yêu cầu.'
      });
    }

    let finalImage = existing.image || DEFAULT_PLACEHOLDER;
    if (image !== undefined) {
      if (typeof image === 'string' && image.trim() !== '') {
        const trimmedImg = image.trim();
        if (!isValidImageUrl(trimmedImg)) {
          return res.status(400).json({
            success: false,
            message: 'Đường dẫn ảnh không hợp lệ. Vui lòng nhập URL bắt đầu bằng http://, https:// hoặc /public/images/.'
          });
        }
        finalImage = trimmedImg;
      } else {
        finalImage = DEFAULT_PLACEHOLDER;
      }
    }

    await dbAsync.run(
      `UPDATE dishes SET
        category_id = ?,
        name = ?,
        description = ?,
        price = ?,
        original_price = ?,
        image = ?,
        spice_levels_allowed = ?,
        is_available = ?,
        is_featured = ?,
        is_new = ?,
        dietary_tags = ?,
        prep_minutes = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        category_id !== undefined ? category_id : existing.category_id,
        name !== undefined ? name.trim() : existing.name,
        description !== undefined ? description : existing.description,
        price !== undefined ? parseFloat(price) : existing.price,
        original_price !== undefined ? parseFloat(original_price) : existing.original_price,
        finalImage,
        spice_levels_allowed !== undefined ? parseInt(spice_levels_allowed) : existing.spice_levels_allowed,
        is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available,
        is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
        is_new !== undefined ? (is_new ? 1 : 0) : existing.is_new,
        dietary_tags !== undefined ? dietary_tags : existing.dietary_tags,
        prep_minutes !== undefined ? parseInt(prep_minutes) : existing.prep_minutes,
        id
      ]
    );

    // Cập nhật lại danh sách topping nếu được gửi lên
    if (Array.isArray(toppings)) {
      await dbAsync.run('DELETE FROM dish_toppings WHERE dish_id = ?', [id]);
      for (let t of toppings) {
        if (t.name && t.name.trim() !== '') {
          await dbAsync.run(
            'INSERT INTO dish_toppings (dish_id, name, price) VALUES (?, ?, ?)',
            [id, t.name.trim(), parseFloat(t.price) || 0]
          );
        }
      }
    }

    const updated = await dbAsync.get('SELECT * FROM dishes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Đã cập nhật món ăn thành công!',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. BẬT/TẮT TRẠNG THÁI CÒN/HẾT MÓN NHANH CHÓNG (Mục 2: Toggle is_available)
 */
async function toggleDishAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await dbAsync.get('SELECT id, is_available FROM dishes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn.' });
    }

    const newStatus = existing.is_available === 1 ? 0 : 1;
    await dbAsync.run('UPDATE dishes SET is_available = ? WHERE id = ?', [newStatus, id]);

    res.json({
      success: true,
      message: newStatus === 1 ? 'Đã bật trạng thái Còn món.' : 'Đã chuyển thành Hết món.',
      is_available: newStatus
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. XÓA MÓN ĂN (Mục 2: Admin Quản lý món)
 */
async function deleteDish(req, res, next) {
  try {
    const { id } = req.params;
    await dbAsync.run('DELETE FROM dishes WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Đã xóa món ăn khỏi thực đơn.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDishes,
  getDishById,
  createDish,
  updateDish,
  toggleDishAvailability,
  deleteDish
};
