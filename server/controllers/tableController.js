/**
 * TABLE CONTROLLER (Mục 10: Sơ đồ bàn & QR gọi món tại bàn)
 * Áp dụng skills: backend-development-feature-development, sql-pro
 */

const QRCode = require('qrcode');
const { dbAsync } = require('../config/db');

// Lấy toàn bộ sơ đồ bàn (kèm mã QR data URL)
async function getTables(req, res, next) {
  try {
    const tables = await dbAsync.all('SELECT * FROM tables ORDER BY id ASC');
    
    // Gắn thêm mã QR Data URL
    const enrichedTables = await Promise.all(tables.map(async (t) => {
      const qrUrl = `http://${req.headers.host || 'localhost:5000'}/?table=${t.qr_token}`;
      let qrImage = '';
      try {
        qrImage = await QRCode.toDataURL(qrUrl, { margin: 1, width: 220 });
      } catch (err) {
        console.error('QR Error:', err);
      }
      return {
        ...t,
        qr_url: qrUrl,
        qr_image: qrImage
      };
    }));

    res.json({
      success: true,
      data: enrichedTables
    });
  } catch (err) {
    next(err);
  }
}

// Cập nhật trạng thái bàn ăn (Trống, Có khách, Đã đặt, Cần dọn)
async function updateTableStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['empty', 'occupied', 'reserved', 'cleaning'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái bàn không hợp lệ.' });
    }

    await dbAsync.run('UPDATE tables SET status = ? WHERE id = ?', [status, id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('table:status', { tableId: id, status });
    }

    res.json({ success: true, message: `Bàn đã chuyển sang trạng thái: ${status}` });
  } catch (err) {
    next(err);
  }
}

// Tra cứu thông tin bàn khi khách quét mã QR
async function getTableByToken(req, res, next) {
  try {
    const { token } = req.params;
    const table = await dbAsync.get('SELECT * FROM tables WHERE qr_token = ?', [token]);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Mã bàn không hợp lệ.' });
    }
    res.json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTables,
  updateTableStatus,
  getTableByToken
};
