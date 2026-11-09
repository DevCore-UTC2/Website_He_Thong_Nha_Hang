/**
 * RESERVATION CONTROLLER — VỊ NHÀ MÌNH
 * Mục 11: Đặt bàn & Đặt tiệc trực tuyến chuẩn hóa
 * - Chuẩn hóa khung giờ hoạt động (09:00 – 21:00) theo múi giờ Việt Nam
 * - Kiểm tra lead time (ít nhất 1 giờ trước) và tối đa 30 ngày
 * - Kiểm tra thời lượng từng loại tiệc (normal 2h, family 2.5h, birthday 3h, corporate 3h)
 * - Kiểm tra sức chứa bàn và chống trùng lịch đặt trên cùng bàn
 * - Không khóa bàn quá sớm cho ngày tương lai
 */

const { dbAsync } = require('../config/db');
const { isValidName, isValidPhone } = require('../utils/validators');
const { 
  validateReservationTime, 
  PARTY_TYPES_CONFIG, 
  RESERVATION_HOURS_CONFIG 
} = require('../../shared/validators.js');

// Khách hàng gửi yêu cầu đặt bàn hoặc tiệc
async function createReservation(req, res, next) {
  try {
    const {
      customer_name,
      customer_phone,
      guest_count,
      reservation_time,
      area,
      party_type,
      special_request,
      table_id
    } = req.body;

    const userId = req.user ? req.user.id : null;

    if (!customer_name || !customer_phone || !guest_count || !reservation_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng cung cấp đầy đủ thông tin: họ tên, số điện thoại, số khách và thời gian đặt bàn.' 
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
        message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567).'
      });
    }

    // Kiểm tra guest_count từ 1 đến 50
    const guests = parseInt(guest_count, 10);
    if (isNaN(guests) || guests < 1 || guests > 50) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng khách phải từ 1 đến 50 người.'
      });
    }

    // Chuẩn hóa loại hình tiệc (party_type)
    const validPartyTypes = Object.keys(PARTY_TYPES_CONFIG);
    const chosenParty = validPartyTypes.includes(party_type) ? party_type : 'normal';
    const partyConfig = PARTY_TYPES_CONFIG[chosenParty];

    if (guests < partyConfig.min_guests) {
      return res.status(400).json({
        success: false,
        message: `Loại hình "${partyConfig.name}" yêu cầu tối thiểu ${partyConfig.min_guests} khách.`
      });
    }

    // Kiểm tra thời gian đặt bàn theo chuẩn độc lập múi giờ
    const timeValidation = validateReservationTime(reservation_time);
    if (!timeValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: timeValidation.message
      });
    }

    const resDate = new Date(reservation_time);

    // Nếu khách chọn trước bàn cụ thể: kiểm tra sức chứa & trùng lịch
    let finalTableId = null;
    if (table_id) {
      const table = await dbAsync.get('SELECT id, table_number, capacity, status FROM tables WHERE id = ?', [table_id]);
      if (!table) {
        return res.status(400).json({ success: false, message: 'Bàn ăn được chọn không tồn tại.' });
      }
      if (table.capacity < guests) {
        return res.status(400).json({
          success: false,
          message: `Bàn số ${table.table_number} chỉ có sức chứa tối đa ${table.capacity} khách, không đủ cho ${guests} người.`
        });
      }

      // Kiểm tra trùng lịch đặt bàn trên cùng bàn này (cả pending và confirmed)
      const durationMs = (partyConfig.duration_minutes || 120) * 60 * 1000;
      const startA = resDate.getTime();
      const endA = startA + durationMs;

      const existingReservations = await dbAsync.all(
        "SELECT id, reservation_time, party_type FROM reservations WHERE table_id = ? AND status IN ('confirmed', 'pending')",
        [table.id]
      );

      for (const ex of existingReservations) {
        const exConfig = PARTY_TYPES_CONFIG[ex.party_type] || PARTY_TYPES_CONFIG.normal;
        const startB = new Date(ex.reservation_time).getTime();
        const endB = startB + (exConfig.duration_minutes * 60 * 1000);

        if (startA < endB && endA > startB) {
          return res.status(400).json({
            success: false,
            message: `Bàn số ${table.table_number} đã có lịch đặt trước trùng khung giờ này. Quý khách vui lòng chọn bàn khác hoặc dời giờ đặt.`
          });
        }
      }
      finalTableId = table.id;
    }

    // Tương thích SQLite CHECK constraint: normal, birthday, corporate, wedding
    const dbPartyType = ['birthday', 'corporate', 'wedding'].includes(chosenParty) ? chosenParty : 'normal';

    const result = await dbAsync.run(
      `INSERT INTO reservations (
        user_id, customer_name, customer_phone, guest_count, reservation_time, 
        area, party_type, special_request, deposit_amount, status, table_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)`,
      [
        userId, 
        customer_name.trim(), 
        customer_phone.trim(), 
        guests, 
        resDate.toISOString(), 
        area || 'Tầng 1', 
        dbPartyType, 
        special_request ? String(special_request).slice(0, 300).trim() : '',
        finalTableId
      ]
    );

    // Khi khách hàng quét QR hoặc chọn bàn cụ thể: Tự động chuyển bàn sang trạng thái 'reserved' (Đã đặt)
    if (finalTableId) {
      await dbAsync.run("UPDATE tables SET status = 'reserved' WHERE id = ?", [finalTableId]);
      const io = req.app.get('io');
      if (io) {
        io.emit('table:status', { tableId: finalTableId, status: 'reserved' });
      }
    }

    res.status(201).json({
      success: true,
      message: finalTableId 
        ? 'Bàn đã được giữ chỗ và tự động chuyển sang trạng thái ĐÃ ĐẶT thành công!' 
        : 'Yêu cầu giữ chỗ đã được tiếp nhận! Nhà hàng sẽ liên hệ xác nhận trong ít phút.',
      data: {
        id: result.id,
        customer_name: customer_name.trim(),
        guest_count: guests,
        party_type: chosenParty,
        party_name: partyConfig.name,
        duration_minutes: partyConfig.duration_minutes,
        reservation_time: resDate.toISOString(),
        status: 'pending',
        table_id: finalTableId
      }
    });
  } catch (err) {
    next(err);
  }
}

// Lấy danh sách yêu cầu đặt bàn (Nhân viên / Admin)
async function getReservations(req, res, next) {
  try {
    const list = await dbAsync.all(
      `SELECT r.*, t.table_number, t.capacity as table_capacity
       FROM reservations r
       LEFT JOIN tables t ON r.table_id = t.id
       ORDER BY r.reservation_time ASC`
    );

    const formatted = list.map(r => ({
      ...r,
      party_name: PARTY_TYPES_CONFIG[r.party_type]?.name || 'Ăn uống thông thường',
      duration_minutes: PARTY_TYPES_CONFIG[r.party_type]?.duration_minutes || 120
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
}

// Cập nhật trạng thái duyệt / từ chối đặt bàn (Nhân viên / Admin)
async function updateReservationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, table_id } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'rejected', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đặt bàn không hợp lệ (chỉ chấp nhận: pending, confirmed, rejected, cancelled).'
      });
    }

    const reservation = await dbAsync.get('SELECT * FROM reservations WHERE id = ?', [id]);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đặt bàn.' });
    }

    const assignedTableId = table_id !== undefined ? table_id : reservation.table_id;

    if (status === 'confirmed' && assignedTableId) {
      const table = await dbAsync.get('SELECT id, table_number, capacity FROM tables WHERE id = ?', [assignedTableId]);
      if (!table) {
        return res.status(400).json({ success: false, message: 'Bàn ăn được chỉ định không tồn tại.' });
      }

      if (table.capacity < reservation.guest_count) {
        return res.status(400).json({
          success: false,
          message: `Bàn số ${table.table_number} chỉ có sức chứa ${table.capacity} người, không đủ cho ${reservation.guest_count} khách.`
        });
      }

      // Kiểm tra trùng lịch đặt
      const partyConfig = PARTY_TYPES_CONFIG[reservation.party_type] || PARTY_TYPES_CONFIG.normal;
      const durationMs = (partyConfig.duration_minutes || 120) * 60 * 1000;
      const startA = new Date(reservation.reservation_time).getTime();
      const endA = startA + durationMs;

      const otherConfirmed = await dbAsync.all(
        'SELECT id, reservation_time, party_type FROM reservations WHERE table_id = ? AND status = \'confirmed\' AND id != ?',
        [table.id, id]
      );

      for (const ex of otherConfirmed) {
        const exConfig = PARTY_TYPES_CONFIG[ex.party_type] || PARTY_TYPES_CONFIG.normal;
        const startB = new Date(ex.reservation_time).getTime();
        const endB = startB + (exConfig.duration_minutes * 60 * 1000);

        if (startA < endB && endA > startB) {
          return res.status(400).json({
            success: false,
            message: `Bàn số ${table.table_number} đã có đơn đặt trùng khung giờ này. Vui lòng chọn bàn khác.`
          });
        }
      }

      // Không khóa bàn quá sớm cho ngày tương lai:
      // Chỉ chuyển trạng thái tables sang 'reserved' nếu đơn đặt bàn diễn ra TRONG HÔM NAY trong vòng 2 tiếng tới
      const resDate = new Date(reservation.reservation_time);
      const now = new Date();
      const diffHours = (resDate.getTime() - now.getTime()) / (3600 * 1000);

      if (diffHours >= 0 && diffHours <= 2) {
        await dbAsync.run('UPDATE tables SET status = \'reserved\' WHERE id = ?', [assignedTableId]);
      }
    }

    // Nếu hủy đơn đặt bàn đã từng gắn bàn, kiểm tra có cần giải phóng trạng thái bàn hay không
    if ((status === 'cancelled' || status === 'rejected') && reservation.table_id) {
      const activeResOnTable = await dbAsync.get(
        'SELECT id FROM reservations WHERE table_id = ? AND status = \'confirmed\' AND id != ?',
        [reservation.table_id, id]
      );
      if (!activeResOnTable) {
        await dbAsync.run('UPDATE tables SET status = \'empty\' WHERE id = ? AND status = \'reserved\'', [reservation.table_id]);
      }
    }

    await dbAsync.run(
      'UPDATE reservations SET status = ?, table_id = ? WHERE id = ?',
      [status, assignedTableId || null, id]
    );

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đặt bàn: ${status}`,
      data: {
        id: Number(id),
        status,
        table_id: assignedTableId || null
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReservation,
  getReservations,
  updateReservationStatus
};
