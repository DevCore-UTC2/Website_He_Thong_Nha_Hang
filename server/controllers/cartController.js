/**
 * CART CONTROLLER — VỊ NHÀ MÌNH
 * Mục 5: Giỏ hàng đồng bộ an toàn với Database qua Transaction
 * Bảo vệ: Bóc tách giỏ theo tài khoản, không tin giá client gửi lên, kiểm tra tính sẵn sàng của món
 */

const { dbAsync } = require('../config/db');

// Lấy giỏ hàng của người dùng hiện tại từ Database
async function getCart(req, res, next) {
  try {
    const userId = req.user.id;

    let cart = await dbAsync.get('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!cart) {
      const resCart = await dbAsync.run('INSERT INTO carts (user_id) VALUES (?)', [userId]);
      cart = { id: resCart.id };
    }

    const items = await dbAsync.all(
      `SELECT ci.id, ci.dish_id, ci.quantity, ci.spice_level, ci.selected_toppings, ci.note, ci.unit_price,
              d.name as dish_name, d.image as dish_image, d.price as dish_price, d.is_available
       FROM cart_items ci
       JOIN dishes d ON ci.dish_id = d.id
       WHERE ci.cart_id = ?
       ORDER BY ci.id ASC`,
      [cart.id]
    );

    // Parse toppings JSON và làm sạch dữ liệu
    const parsedItems = items.map(item => ({
      id: item.id,
      dish_id: item.dish_id,
      dish_name: item.dish_name,
      dish_image: item.dish_image,
      dish_price: item.dish_price,
      quantity: item.quantity,
      spice_level: item.spice_level,
      note: item.note || '',
      is_available: Boolean(item.is_available),
      selected_toppings: item.selected_toppings ? (typeof item.selected_toppings === 'string' ? JSON.parse(item.selected_toppings) : item.selected_toppings) : [],
      unit_price: item.unit_price
    }));

    res.json({
      success: true,
      data: {
        cart_id: cart.id,
        items: parsedItems
      }
    });
  } catch (err) {
    next(err);
  }
}

// Đồng bộ toàn bộ giỏ hàng từ Frontend gửi lên bên trong SQLite Transaction an toàn
async function syncCart(req, res, next) {
  let inTransaction = false;
  try {
    const userId = req.user.id;
    const { items } = req.body; // Mảng các món { dish_id, quantity, spice_level, selected_toppings, note }

    let cart = await dbAsync.get('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!cart) {
      const resCart = await dbAsync.run('INSERT INTO carts (user_id) VALUES (?)', [userId]);
      cart = { id: resCart.id };
    }

    await dbAsync.run('BEGIN TRANSACTION');
    inTransaction = true;

    // Xóa danh sách cũ của giỏ hàng này
    await dbAsync.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);

    const validatedItems = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item || !item.dish_id) continue;

        // 1. Kiểm tra tính hợp lệ và giá thật của món trong cơ sở dữ liệu
        const dish = await dbAsync.get(
          'SELECT id, name, price, is_available FROM dishes WHERE id = ?',
          [item.dish_id]
        );
        if (!dish || !dish.is_available) continue; // Bỏ qua món không tồn tại hoặc tạm hết

        // 2. Validate và chuẩn hóa số lượng (1 - 99)
        const quantity = Math.max(1, Math.min(parseInt(item.quantity, 10) || 1, 99));

        // 3. Tra cứu giá thật của topping từ DB
        const clientToppings = Array.isArray(item.selected_toppings) ? item.selected_toppings : [];
        let toppingSum = 0;
        const verifiedToppings = [];

        for (const t of clientToppings) {
          if (!t) continue;
          const toppingId = t.id || t;
          const dbTopping = await dbAsync.get(
            'SELECT id, name, price FROM dish_toppings WHERE id = ? AND dish_id = ? AND is_available = 1',
            [toppingId, dish.id]
          );
          if (dbTopping) {
            toppingSum += dbTopping.price;
            verifiedToppings.push({
              id: dbTopping.id,
              name: dbTopping.name,
              price: dbTopping.price
            });
          }
        }

        // 4. Giá đơn vị thật = giá món + tổng topping (không tin unit_price do client tự gửi)
        const verifiedUnitPrice = dish.price + toppingSum;
        const spiceLevel = Math.max(0, Math.min(parseInt(item.spice_level, 10) || 0, 4));
        const note = item.note ? String(item.note).replace(/<[^>]*>?/gm, '').slice(0, 200).trim() : '';

        await dbAsync.run(
          `INSERT INTO cart_items (cart_id, dish_id, quantity, spice_level, selected_toppings, note, unit_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            cart.id,
            dish.id,
            quantity,
            spiceLevel,
            JSON.stringify(verifiedToppings),
            note,
            verifiedUnitPrice
          ]
        );

        validatedItems.push({
          dish_id: dish.id,
          dish_name: dish.name,
          quantity,
          spice_level: spiceLevel,
          selected_toppings: verifiedToppings,
          note,
          unit_price: verifiedUnitPrice,
          price: verifiedUnitPrice
        });
      }
    }

    await dbAsync.run('COMMIT');
    inTransaction = false;

    res.json({
      success: true,
      message: 'Đã đồng bộ giỏ hàng an toàn thành công!',
      data: {
        cart_id: cart.id,
        items_count: validatedItems.length,
        items: validatedItems
      }
    });
  } catch (err) {
    if (inTransaction) {
      try {
        await dbAsync.run('ROLLBACK');
      } catch (_) {}
    }
    next(err);
  }
}

module.exports = {
  getCart,
  syncCart
};
