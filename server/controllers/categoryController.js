/**
 * CATEGORY CONTROLLER (Mục 2 & Mục 3: Quản lý và lọc danh mục thực đơn)
 * Áp dụng skills: backend-development-feature-development, sql-pro
 */

const { dbAsync } = require('../config/db');

// Lấy danh sách danh mục (công khai cho khách hoặc quản trị)
async function getCategories(req, res, next) {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const sql = isAdmin 
      ? 'SELECT * FROM categories ORDER BY sort_order ASC, id ASC'
      : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC';

    const categories = await dbAsync.all(sql);

    // Đếm số món trong từng danh mục
    for (let cat of categories) {
      const countRow = await dbAsync.get(
        'SELECT COUNT(*) as dishCount FROM dishes WHERE category_id = ?',
        [cat.id]
      );
      cat.dish_count = countRow ? countRow.dishCount : 0;
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
}

// Tạo danh mục mới (Admin)
async function createCategory(req, res, next) {
  try {
    const { name, slug, icon, description, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục không được để trống.'
      });
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const result = await dbAsync.run(
      `INSERT INTO categories (name, slug, icon, description, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), finalSlug, icon || '🍽️', description || '', sort_order || 0]
    );

    const newCat = await dbAsync.get('SELECT * FROM categories WHERE id = ?', [result.id]);

    res.status(201).json({
      success: true,
      message: 'Đã tạo danh mục mới thành công!',
      data: newCat
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({
        success: false,
        message: 'Slug hoặc tên danh mục này đã tồn tại.'
      });
    }
    next(err);
  }
}

// Cập nhật danh mục (Admin)
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug, icon, description, sort_order, is_active } = req.body;

    const existing = await dbAsync.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục yêu cầu.'
      });
    }

    await dbAsync.run(
      `UPDATE categories 
       SET name = ?, slug = ?, icon = ?, description = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [
        name || existing.name,
        slug || existing.slug,
        icon !== undefined ? icon : existing.icon,
        description !== undefined ? description : existing.description,
        sort_order !== undefined ? sort_order : existing.sort_order,
        is_active !== undefined ? is_active : existing.is_active,
        id
      ]
    );

    const updated = await dbAsync.get('SELECT * FROM categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Cập nhật danh mục thành công!',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

// Xóa danh mục (Admin)
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    // Kiểm tra xem danh mục có món ăn hay không
    const dishCount = await dbAsync.get('SELECT COUNT(*) as count FROM dishes WHERE category_id = ?', [id]);
    if (dishCount && dishCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa danh mục này vì đang có ${dishCount.count} món ăn trực thuộc. Hãy chuyển hoặc xóa các món đó trước.`
      });
    }

    await dbAsync.run('DELETE FROM categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Đã xóa danh mục thành công!'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
