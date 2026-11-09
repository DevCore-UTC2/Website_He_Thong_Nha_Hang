/**
 * INVENTORY CONTROLLER (Mục 15: Quản lý Kho & Cảnh báo tồn thấp)
 * Áp dụng skills: backend-development-feature-development, sql-pro
 */

const { dbAsync } = require('../config/db');

// Lấy danh sách kho nguyên liệu (kèm cờ cảnh báo đỏ khi tồn dưới ngưỡng)
async function getInventory(req, res, next) {
  try {
    const items = await dbAsync.all(
      `SELECT *, (quantity <= min_threshold) as is_low_stock 
       FROM ingredients 
       ORDER BY is_low_stock DESC, name ASC`
    );

    const lowStockCount = items.filter(it => it.is_low_stock === 1).length;

    res.json({
      success: true,
      data: items,
      low_stock_count: lowStockCount
    });
  } catch (err) {
    next(err);
  }
}

// Nhập / Xuất kho
async function updateStock(req, res, next) {
  try {
    const { id } = req.params;
    const { change_amount, action_type, note } = req.body; // change_amount > 0 cho nhập, < 0 cho xuất

    const item = await dbAsync.get('SELECT * FROM ingredients WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu.' });

    const change = parseFloat(change_amount);
    if (isNaN(change) || change === 0) {
      return res.status(400).json({ success: false, message: 'Số lượng thay đổi kho không hợp lệ.' });
    }

    const newQty = item.quantity + change;
    if (newQty < 0) {
      return res.status(400).json({ success: false, message: 'Số lượng xuất kho không thể vượt quá lượng tồn kho hiện tại.' });
    }

    await dbAsync.run(
      'UPDATE ingredients SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newQty, id]
    );

    await dbAsync.run(
      'INSERT INTO inventory_logs (ingredient_id, change_amount, action_type, note) VALUES (?, ?, ?, ?)',
      [id, change_amount, action_type || 'adjustment', note || '']
    );

    res.json({
      success: true,
      message: 'Cập nhật kho nguyên liệu thành công!',
      new_quantity: newQty
    });
  } catch (err) {
    next(err);
  }
}

// Thêm nguyên liệu mới
async function createIngredient(req, res, next) {
  try {
    const { name, unit, quantity, min_threshold, cost_per_unit } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên nguyên liệu và đơn vị tính.' });
    }

    await dbAsync.run(
      `INSERT INTO ingredients (name, unit, quantity, min_threshold, cost_per_unit) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), unit.trim(), parseFloat(quantity) || 0, parseFloat(min_threshold) || 10, parseFloat(cost_per_unit) || 0]
    );

    res.status(201).json({ success: true, message: 'Đã thêm nguyên liệu vào kho!' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInventory,
  updateStock,
  createIngredient
};
