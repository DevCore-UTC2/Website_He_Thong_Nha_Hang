/**
 * ORDER CONTROLLER (Mục 7: Tạo đơn & Thanh toán, Mục 8: Theo dõi đơn, Mục 9: Quản lý bếp & giao hàng)
 * Áp dụng skills: backend-development-feature-development, sql-pro, billing-automation
 */

const { dbAsync } = require('../config/db');
const { isValidName, isValidPhone } = require('../utils/validators');
const { isValidTaxId, isValidEmail } = require('../../shared/validators');
const { getVatRate, distributeLargestRemainder, splitVatFromGross } = require('../config/tax');
const { issueInvoiceForOrder } = require('../services/invoiceService');
const { isOrderAccepting } = require('../services/storeStatusService');

// 1. TẠO ĐƠN HÀNG MỚI (Mục 7: Tính lại giá ở server, áp voucher, sandbox payment)
async function createOrder(req, res, next) {
  let inTransaction = false;
  try {
    const {
      order_type, // 'dine_in', 'takeaway', 'delivery'
      table_id,
      customer_name,
      customer_phone,
      delivery_address,
      payment_method, // 'cash', 'qr_pay', 'sandbox_card'
      voucher_code,
      invoice_company_name,
      invoice_tax_id,
      invoice_address,
      invoice_email,
      items // Mảng [{ dish_id, quantity, spice_level, selected_toppings, note }]
    } = req.body;

    const userId = req.user ? req.user.id : null;

    // Kiểm tra trạng thái mở cửa / nhận đơn qua StoreStatusService thống nhất
    const storeStatusCheck = isOrderAccepting();
    if (!storeStatusCheck.allowed) {
      return res.status(400).json({
        success: false,
        message: storeStatusCheck.message
      });
    }

    if (!order_type || !customer_name || !customer_phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin khách hàng và danh sách món ăn.'
      });
    }

    // A4: Validate Họ tên và SĐT
    if (!isValidName(customer_name)) {
      return res.status(400).json({
        success: false,
        message: 'Họ tên chỉ gồm chữ cái, không chứa số và dài từ 2 đến 50 ký tự.'
      });
    }

    if (!isValidPhone(customer_phone, false)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ (ví dụ 0901234567).'
      });
    }

    // Validate thông tin xuất hóa đơn doanh nghiệp nếu được cung cấp
    if (invoice_tax_id && !isValidTaxId(invoice_tax_id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã số thuế doanh nghiệp không hợp lệ theo quy định Modulo 11.'
      });
    }

    if (invoice_email && !isValidEmail(invoice_email)) {
      return res.status(400).json({
        success: false,
        message: 'Email nhận hóa đơn không hợp lệ.'
      });
    }

    // C5: Validate order_type
    const validOrderTypes = ['dine_in', 'takeaway', 'delivery'];
    if (!validOrderTypes.includes(order_type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại hình phục vụ không hợp lệ (dine_in, takeaway, delivery).'
      });
    }

    // C5: Validate payment_method
    const validPaymentMethods = ['cash', 'qr_pay', 'sandbox_card'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ (cash, qr_pay, sandbox_card).'
      });
    }

    // C5: Kiểm tra dine_in và delivery
    let finalTableId = null;
    let finalAddress = null;

    if (order_type === 'dine_in') {
      if (!table_id) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn bàn ăn cho hình thức dùng tại bàn.'
        });
      }
      const table = await dbAsync.get('SELECT id, status FROM tables WHERE id = ?', [table_id]);
      if (!table) {
        return res.status(400).json({
          success: false,
          message: 'Bàn ăn được chọn không tồn tại.'
        });
      }
      if (table.status === 'occupied') {
        return res.status(400).json({
          success: false,
          message: 'Bàn này hiện đang có khách. Vui lòng chọn bàn khác.'
        });
      }
      finalTableId = table.id;
    } else if (order_type === 'delivery') {
      if (!delivery_address || !String(delivery_address).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp địa chỉ nhận hàng chi tiết.'
        });
      }
      finalAddress = String(delivery_address).trim();
    }
    // takeaway & delivery: finalTableId = null

    // Tính toán lại giá phía máy chủ (Snapshot giá an toàn)
    let subtotal = 0;
    const validatedItems = [];

    for (let item of items) {
      const dish = await dbAsync.get('SELECT id, name, price, is_available, vat_category FROM dishes WHERE id = ?', [item.dish_id]);
      if (!dish) {
        return res.status(400).json({ success: false, message: `Món ăn mã #${item.dish_id} không tồn tại.` });
      }
      if (!dish.is_available) {
        return res.status(400).json({ success: false, message: `Món "${dish.name}" hiện đang tạm hết. Vui lòng chọn món khác.` });
      }

      // C5: Ép quantity là số nguyên trong khoảng 1-99
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({
          success: false,
          message: `Số lượng món "${dish.name}" không hợp lệ (phải từ 1 đến 99).`
        });
      }

      // C5: Tra giá topping từ DB bảng dish_toppings
      const clientToppings = Array.isArray(item.selected_toppings) ? item.selected_toppings : [];
      let toppingSum = 0;
      const verifiedToppings = [];

      for (let t of clientToppings) {
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

      const itemUnitPrice = dish.price + toppingSum;
      const itemTotal = itemUnitPrice * quantity;
      subtotal += itemTotal;

      const vatCategory = dish.vat_category || 'food';
      const vatRate = getVatRate(vatCategory, new Date());

      validatedItems.push({
        dish_id: dish.id,
        dish_name: dish.name,
        dish_price: dish.price,
        quantity,
        spice_level: parseInt(item.spice_level, 10) || 0,
        selected_toppings: JSON.stringify(verifiedToppings),
        note: item.note ? String(item.note).slice(0, 200) : '',
        item_total: itemTotal,
        vat_category: vatCategory,
        vat_rate: vatRate
      });
    }

    // Áp dụng voucher (nếu có)
    let discountAmount = 0;
    let appliedVoucherId = null;
    let appliedVoucherCode = null;

    if (voucher_code) {
      const v = await dbAsync.get('SELECT * FROM vouchers WHERE code = ? AND is_active = 1', [voucher_code.toUpperCase().trim()]);
      if (!v) {
        return res.status(400).json({ success: false, message: 'Mã voucher không tồn tại hoặc đã hết hạn.' });
      }
      if (v.used_count >= v.usage_limit || !v.is_active) {
        return res.status(400).json({ success: false, message: 'Mã voucher này đã hết lượt sử dụng.' });
      }
      if (v.user_id && (!userId || v.user_id !== userId)) {
        return res.status(403).json({ success: false, message: 'Mã voucher này thuộc quyền sở hữu của tài khoản thành viên khác.' });
      }
      if (subtotal < v.min_order_value) {
        return res.status(400).json({
          success: false,
          message: `Đơn hàng tối thiểu phải từ ${new Intl.NumberFormat('vi-VN').format(v.min_order_value)}đ để áp dụng voucher này.`
        });
      }

      appliedVoucherId = v.id;
      appliedVoucherCode = v.code;
      if (v.discount_type === 'percent') {
        discountAmount = (subtotal * v.discount_value) / 100;
        if (v.max_discount > 0 && discountAmount > v.max_discount) discountAmount = v.max_discount;
      } else {
        discountAmount = v.discount_value;
      }
      discountAmount = Math.min(discountAmount, subtotal);
    }

    discountAmount = Math.round(discountAmount);

    // Phân bổ voucher / giảm giá theo phương pháp phần dư lớn nhất (Largest Remainder Method)
    const itemGrossTotals = validatedItems.map(it => it.item_total);
    const allocatedDiscounts = distributeLargestRemainder(itemGrossTotals, discountAmount);

    let totalBeforeVat = 0;
    let vat8Amount = 0;
    let vat10Amount = 0;

    for (let i = 0; i < validatedItems.length; i++) {
      const it = validatedItems[i];
      const discountAlloc = allocatedDiscounts[i];
      const netGross = Math.max(0, it.item_total - discountAlloc);
      const split = splitVatFromGross(netGross, it.vat_rate);

      it.discount_allocated = discountAlloc;
      it.amount_before_vat = split.amountBeforeVat;
      it.vat_amount = split.vatAmount;

      totalBeforeVat += split.amountBeforeVat;
      if (it.vat_rate === 0.08) {
        vat8Amount += split.vatAmount;
      } else {
        vat10Amount += split.vatAmount;
      }
    }

    const totalVat = vat8Amount + vat10Amount;
    // Giá niêm yết đã bao gồm VAT nên tổng thanh toán bằng subtotal - discountAmount
    const totalAmount = Math.max(0, subtotal - discountAmount);

    // Khớp sai số làm tròn nếu có
    const roundingDiff = totalAmount - (totalBeforeVat + totalVat);
    if (roundingDiff !== 0 && validatedItems.length > 0) {
      totalBeforeVat += roundingDiff;
      validatedItems[0].amount_before_vat += roundingDiff;
    }

    // C5: Sinh mã đơn hàng ngẫu nhiên không trùng lặp
    let orderCode = '';
    for (let attempts = 0; attempts < 15; attempts++) {
      const candidate = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const existing = await dbAsync.get('SELECT id FROM orders WHERE order_code = ?', [candidate]);
      if (!existing) {
        orderCode = candidate;
        break;
      }
    }
    if (!orderCode) {
      orderCode = `ORD-${Date.now().toString().slice(-4)}`;
    }

    const paymentStatus = payment_method === 'cash' ? 'unpaid' : 'paid';

    // C5: Dùng SQLite Transaction (BEGIN/COMMIT/ROLLBACK)
    await dbAsync.run('BEGIN TRANSACTION');
    inTransaction = true;

    // Tăng lượt dùng voucher bên trong transaction và vô hiệu hóa nếu đạt giới hạn
    if (appliedVoucherId) {
      await dbAsync.run(
        'UPDATE vouchers SET used_count = used_count + 1, is_active = CASE WHEN (used_count + 1) >= usage_limit THEN 0 ELSE is_active END WHERE id = ?',
        [appliedVoucherId]
      );
    }

    // Lưu đơn hàng vào Database với đầy đủ bóc tách thuế VAT và thông tin hóa đơn
    const resOrder = await dbAsync.run(
      `INSERT INTO orders (
        order_code, user_id, table_id, order_type, customer_name, customer_phone,
        delivery_address, subtotal, discount_amount, voucher_code,
        total_before_vat, vat_8_amount, vat_10_amount, vat_amount,
        total_amount, payment_method, payment_status, status, estimated_minutes, is_legacy_tax,
        invoice_company_name, invoice_tax_id, invoice_address, invoice_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', 20, 0, ?, ?, ?, ?)`,
      [
        orderCode,
        userId,
        finalTableId,
        order_type,
        customer_name.trim(),
        customer_phone.trim(),
        finalAddress,
        subtotal,
        discountAmount,
        appliedVoucherCode,
        totalBeforeVat,
        vat8Amount,
        vat10Amount,
        totalVat,
        totalAmount,
        payment_method,
        paymentStatus,
        invoice_company_name ? invoice_company_name.trim() : null,
        invoice_tax_id ? invoice_tax_id.trim() : null,
        invoice_address ? invoice_address.trim() : null,
        invoice_email ? invoice_email.trim() : null
      ]
    );

    const orderId = resOrder.id;

    // Lưu các món vào order_items kèm theo mức thuế và tiền trước thuế
    for (let it of validatedItems) {
      await dbAsync.run(
        `INSERT INTO order_items (
          order_id, dish_id, dish_name, dish_price, quantity, spice_level, 
          selected_toppings, note, item_total, vat_category, vat_rate, 
          discount_allocated, amount_before_vat, vat_amount, item_status, status_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', CURRENT_TIMESTAMP)`,
        [
          orderId, 
          it.dish_id, 
          it.dish_name, 
          it.dish_price, 
          it.quantity, 
          it.spice_level, 
          it.selected_toppings, 
          it.note, 
          it.item_total,
          it.vat_category,
          it.vat_rate,
          it.discount_allocated,
          it.amount_before_vat,
          it.vat_amount
        ]
      );
    }

    // Nếu đặt tại bàn, chuyển trạng thái bàn sang "occupied"
    if (finalTableId) {
      await dbAsync.run('UPDATE tables SET status = \'occupied\', current_order_id = ? WHERE id = ?', [orderId, finalTableId]);
    }

    // Xuất hóa đơn điện tử tự động theo Nghị định 123/2020/NĐ-CP bên trong transaction
    const invoiceRes = await issueInvoiceForOrder({
      dbAsync,
      orderId,
      orderCode,
      buyerInfo: {
        buyer_name: customer_name,
        buyer_phone: customer_phone,
        buyer_tax_id: invoice_tax_id,
        buyer_company_name: invoice_company_name,
        buyer_address: invoice_address || finalAddress,
        buyer_email: invoice_email
      },
      amounts: {
        totalBeforeVat,
        vat8Amount,
        vat10Amount,
        totalVat,
        discountAmount,
        totalAmount
      },
      validatedItems,
      paymentMethod: payment_method
    });

    // COMMIT transaction an toàn
    await dbAsync.run('COMMIT');
    inTransaction = false;

    // C12: Bắn sự kiện realtime cho Bếp & Nhân viên (không broadcast dữ liệu nhạy cảm cho public)
    const io = req.app && req.app.get ? req.app.get('io') : null;
    if (io) {
      io.to('staff').emit('order:new', { orderId, orderCode, order_type, totalAmount });
      io.to('kitchen').emit('order:new', { orderId, orderCode, order_type, totalAmount });
    }

    res.status(201).json({
      success: true,
      message: 'Đặt đơn hàng thành công!',
      data: {
        order_id: orderId,
        order_code: orderCode,
        total_amount: totalAmount,
        payment_status: paymentStatus,
        status: 'received',
        invoice_number: invoiceRes.invoice_number,
        invoice_formatted: invoiceRes.formatted_number,
        invoice_url: `/hoa-don.html?code=${orderCode}`
      }
    });
  } catch (err) {
    if (inTransaction) {
      try {
        await dbAsync.run('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Lỗi rollback:', rollbackErr);
      }
    }
    next(err);
  }
}

// 2. THEO DÕI TIẾN TRÌNH ĐƠN HÀNG (Mục 8 & Mục 5A: Phân quyền theo dõi đơn)
async function getOrderTracking(req, res, next) {
  try {
    const { code } = req.params;
    const phone = req.query.phone || req.headers['x-customer-phone'];

    // C6: Chỉ tra theo order_code, không tra theo o.id để tránh đoán ID xem thông tin người khác
    const order = await dbAsync.get(
      `SELECT o.*, t.table_number 
       FROM orders o 
       LEFT JOIN tables t ON o.table_id = t.id 
       WHERE o.order_code = ?`,
      [code]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng yêu cầu.' });
    }

    // Phân quyền theo dõi đơn hàng (Mục 5A):
    // 1. Staff và Admin luôn được phép xem để phục vụ và hỗ trợ khách
    const currentUser = req.user;
    const isStaffOrAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff');

    if (!isStaffOrAdmin) {
      if (order.user_id) {
        // Đơn thuộc về tài khoản thành viên (Customer)
        if (!currentUser) {
          // Khách vãng lai tra đơn của thành viên: Cần xác thực số điện thoại đặt hàng
          if (!phone || String(phone).trim() !== String(order.customer_phone).trim()) {
            return res.status(403).json({
              success: false,
              message: 'Đơn hàng này thuộc tài khoản thành viên. Vui lòng đăng nhập hoặc xác thực đúng số điện thoại đặt hàng để theo dõi.'
            });
          }
        } else if (currentUser.id !== order.user_id) {
          // Đã đăng nhập nhưng là tài khoản khác: Chặn tuyệt đối!
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền theo dõi đơn hàng của tài khoản khách hàng khác.'
          });
        }
      }
    }

    const items = await dbAsync.all(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );

    res.json({
      success: true,
      data: {
        ...order,
        items: items.map(it => ({
          ...it,
          selected_toppings: it.selected_toppings ? JSON.parse(it.selected_toppings) : []
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

// 3. HỦY ĐƠN HÀNG (Mục 8: Cho phép hủy khi chưa chế biến, kiểm tra chủ đơn)
async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, order_code, phone } = req.body;

    const order = await dbAsync.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    // C6: Kiểm tra quyền hủy đơn (chủ đơn, hoặc người gửi đúng order_code + SĐT, hoặc staff/admin)
    const currentUser = req.user;
    const isOwner = currentUser && order.user_id && currentUser.id === order.user_id;
    const isStaffOrAdmin = currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin');
    const hasValidGuestProof = order_code && phone && order.order_code === String(order_code).trim() && order.customer_phone === String(phone).trim();

    if (!isOwner && !isStaffOrAdmin && !hasValidGuestProof) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn hàng này. Vui lòng xác thực mã đơn và số điện thoại đặt hàng.'
      });
    }

    if (order.status !== 'received') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được đưa vào chế biến hoặc đang giao, không thể tự hủy trực tuyến. Vui lòng liên hệ nhân viên.'
      });
    }

    await dbAsync.run(
      'UPDATE orders SET status = \'cancelled\', cancel_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [reason || 'Khách hàng yêu cầu hủy đơn', id]
    );

    // Giải phóng bàn nếu có
    if (order.table_id) {
      await dbAsync.run('UPDATE tables SET status = \'empty\', current_order_id = NULL WHERE id = ? AND current_order_id = ?', [order.table_id, id]);
    }

    // Trừ lại điểm nếu trước đó đơn này đã từng hoàn tất
    if (order.user_id && order.status === 'completed') {
      const points = Math.floor(order.total_amount / 10000);
      if (points > 0) {
        await dbAsync.run('UPDATE users SET loyalty_points = MAX(0, loyalty_points - ?) WHERE id = ?', [points, order.user_id]);
      }
    }

    const io = req.app && req.app.get ? req.app.get('io') : null;
    if (io) {
      io.emit('order:status', { orderId: id, status: 'cancelled' });
    }

    res.json({ success: true, message: 'Đã hủy đơn hàng thành công.' });
  } catch (err) {
    next(err);
  }
}

// 4. LẤY DANH SÁCH MÓN TỪ CÁC HÓA ĐƠN CHO NHÂN VIÊN VÀ BẾP (Mục 9 & T2.3)
async function getKitchenOrders(req, res, next) {
  try {
    // Nếu có query view=orders, trả về dạng gom theo đơn hàng (tương thích ngược)
    if (req.query.view === 'orders') {
      const orders = await dbAsync.all(
        `SELECT o.*, t.table_number 
         FROM orders o 
         LEFT JOIN tables t ON o.table_id = t.id 
         WHERE o.status IN ('received', 'cooking', 'ready', 'serving')
         ORDER BY o.created_at ASC, o.id ASC`
      );

      for (let ord of orders) {
        const items = await dbAsync.all('SELECT * FROM order_items WHERE order_id = ?', [ord.id]);
        ord.items = items.map(it => ({
          ...it,
          item_status: it.item_status || 'received',
          selected_toppings: it.selected_toppings ? (typeof it.selected_toppings === 'string' ? JSON.parse(it.selected_toppings) : it.selected_toppings) : []
        }));
      }

      return res.json({ success: true, data: orders });
    }

    // Mặc định (T2.3 & T2.4): Trả về danh sách từng món từ hóa đơn của mọi tài khoản đã đặt
    // Gồm: mã đơn, bàn, tên món, số lượng, ghi chú, thời gian đặt, trạng thái món
    // Sắp xếp món cũ nhất lên trước (created_at ASC, id ASC)
    const items = await dbAsync.all(
      `SELECT 
         oi.id,
         oi.order_id,
         oi.dish_id,
         oi.dish_name,
         oi.dish_price,
         oi.quantity,
         oi.spice_level,
         oi.selected_toppings,
         oi.note,
         COALESCE(oi.item_status, 'received') AS item_status,
         COALESCE(oi.status_updated_at, o.created_at) AS status_updated_at,
         o.order_code,
         o.order_type,
         o.customer_name,
         o.created_at,
         o.status AS order_status,
         t.table_number
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.status NOT IN ('cancelled', 'completed')
         AND COALESCE(oi.item_status, 'received') NOT IN ('completed', 'cancelled')
       ORDER BY o.created_at ASC, oi.id ASC`
    );

    const formattedItems = items.map(it => ({
      ...it,
      selected_toppings: it.selected_toppings ? (typeof it.selected_toppings === 'string' ? JSON.parse(it.selected_toppings) : it.selected_toppings) : []
    }));

    res.json({ success: true, data: formattedItems });
  } catch (err) {
    next(err);
  }
}

// 5. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (Bếp / Thu ngân đổi trạng thái toàn bộ đơn)
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, shipper_name } = req.body;

    const validStatuses = ['received', 'cooking', 'ready', 'serving', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ.' });
    }

    const currentOrder = await dbAsync.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!currentOrder) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    await dbAsync.run(
      `UPDATE orders SET status = ?, shipper_name = COALESCE(?, shipper_name), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, shipper_name || null, id]
    );

    // Cập nhật trạng thái các món trong đơn hàng nếu đổi toàn đơn
    if (['completed', 'cancelled'].includes(status)) {
      await dbAsync.run(
        'UPDATE order_items SET item_status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE order_id = ?',
        [status, id]
      );
    }

    // C5: Tích điểm thành viên chỉ khi đơn chuyển sang "completed" (10.000đ = 1 điểm)
    if (status === 'completed' && currentOrder.status !== 'completed' && currentOrder.user_id) {
      const earnedPoints = Math.floor(currentOrder.total_amount / 10000);
      if (earnedPoints > 0) {
        await dbAsync.run('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?', [earnedPoints, currentOrder.user_id]);
      }
    }

    // Nếu hoàn tất đơn tại bàn, giải phóng bàn sang 'cleaning' hoặc 'empty'
    if (status === 'completed' && currentOrder.table_id) {
      await dbAsync.run('UPDATE tables SET status = \'cleaning\', current_order_id = NULL WHERE id = ?', [currentOrder.table_id]);
    }

    const io = req.app && req.app.get ? req.app.get('io') : null;
    if (io) {
      io.emit('order:status', { orderId: id, status });
    }

    res.json({ success: true, message: `Đã cập nhật trạng thái đơn sang: ${status}` });
  } catch (err) {
    next(err);
  }
}

// 5B. CẬP NHẬT TRẠNG THÁI TỪNG MÓN ĂN TRONG ĐƠN (T2.3)
async function updateOrderItemStatus(req, res, next) {
  try {
    const { id } = req.params;
    let { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Thiếu trạng thái món ăn cần cập nhật.' });
    }

    if (status === 'not_started') status = 'received';

    const validStatuses = ['received', 'cooking', 'ready', 'serving', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Trạng thái món '${status}' không hợp lệ.` });
    }

    const item = await dbAsync.get('SELECT * FROM order_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn trong đơn hàng.' });
    }

    let currentStatus = item.item_status || 'received';
    if (currentStatus === 'not_started') currentStatus = 'received';

    if (currentStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Món ăn đã hoàn tất phục vụ, không thể thay đổi trạng thái.' });
    }
    if (currentStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Món ăn thuộc đơn hàng đã hủy, không thể thay đổi trạng thái.' });
    }

    if (currentStatus === status) {
      return res.status(400).json({ success: false, message: `Món ăn hiện đã ở trạng thái '${status}'.` });
    }

    const flow = ['received', 'cooking', 'ready', 'serving', 'completed'];
    const currentIdx = flow.indexOf(currentStatus);
    const targetIdx = flow.indexOf(status);

    // Kiểm tra lùi trạng thái
    if (targetIdx < currentIdx) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể lùi trạng thái món ăn sai luồng quy định.' 
      });
    }

    // Kiểm tra nhảy cóc (chỉ được chuyển sang bước kế tiếp, riêng ready có thể sang serving hoặc completed)
    const allowedNext = {
      'received': ['cooking'],
      'cooking': ['ready'],
      'ready': ['serving', 'completed'],
      'serving': ['completed']
    };

    if (!allowedNext[currentStatus] || !allowedNext[currentStatus].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể chuyển trạng thái nhảy cóc. Luồng chuẩn: Chưa nấu -> Đang nấu -> Đã nấu xong -> Phục vụ ra bàn.' 
      });
    }

    // Cập nhật trạng thái và thời điểm thay đổi
    await dbAsync.run(
      'UPDATE order_items SET item_status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    // Đồng bộ trạng thái của đơn hàng cha (T2.6)
    const order = await dbAsync.get('SELECT * FROM orders WHERE id = ?', [item.order_id]);
    const initialOrderStatus = order ? order.status : null;
    let newOrderStatus = initialOrderStatus;

    if (order && order.status !== 'cancelled') {
      const allItems = await dbAsync.all('SELECT item_status FROM order_items WHERE order_id = ?', [item.order_id]);
      const statuses = allItems.map(i => i.item_status || 'received');

      const allCompleted = statuses.length > 0 && statuses.every(s => s === 'completed');
      const allServingOrDone = statuses.length > 0 && statuses.every(s => s === 'serving' || s === 'completed');
      const allReadyOrDone = statuses.length > 0 && statuses.every(s => s === 'ready' || s === 'serving' || s === 'completed');
      const anyCookingOrDone = statuses.some(s => s === 'cooking' || s === 'ready' || s === 'serving' || s === 'completed');

      if (allCompleted) {
        newOrderStatus = 'completed';
      } else if (allServingOrDone) {
        newOrderStatus = 'serving';
      } else if (allReadyOrDone) {
        newOrderStatus = 'ready';
      } else if (anyCookingOrDone) {
        newOrderStatus = 'cooking';
      }

      if (newOrderStatus && newOrderStatus !== initialOrderStatus) {
        await dbAsync.run(
          'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newOrderStatus, item.order_id]
        );

        if (newOrderStatus === 'completed') {
          if (order.user_id) {
            const earnedPoints = Math.floor(order.total_amount / 10000);
            if (earnedPoints > 0) {
              await dbAsync.run('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?', [earnedPoints, order.user_id]);
            }
          }
          if (order.table_id) {
            await dbAsync.run('UPDATE tables SET status = \'cleaning\', current_order_id = NULL WHERE id = ?', [order.table_id]);
          }
        }
      }
    }

    const io = req.app && req.app.get ? req.app.get('io') : null;
    if (io) {
      io.emit('order:item_status', { 
        itemId: Number(id), 
        orderId: item.order_id, 
        orderCode: order ? order.order_code : null,
        status, 
        status_updated_at: new Date().toISOString() 
      });
      if (newOrderStatus && newOrderStatus !== initialOrderStatus) {
        io.emit('order:status', { 
          orderId: item.order_id, 
          orderCode: order ? order.order_code : null,
          status: newOrderStatus 
        });
      }
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái món sang: ${status}`,
      data: {
        id: Number(id),
        order_id: item.order_id,
        item_status: status
      }
    });
  } catch (err) {
    next(err);
  }
}

// 6. LỊCH SỬ ĐƠN CỦA KHÁCH HÀNG (Mục 12)
async function getMyOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const orders = await dbAsync.all(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );

    for (let ord of orders) {
      const items = await dbAsync.all('SELECT * FROM order_items WHERE order_id = ?', [ord.id]);
      ord.items = items.map(it => ({
        ...it,
        selected_toppings: it.selected_toppings ? JSON.parse(it.selected_toppings) : []
      }));
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getOrderTracking,
  cancelOrder,
  getKitchenOrders,
  updateOrderStatus,
  updateOrderItemStatus,
  getMyOrders
};
