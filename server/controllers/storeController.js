/**
 * STORE CONTROLLER — VỊ NHÀ MÌNH
 * Điều khiển và truy vấn trạng thái mở/đóng cửa của nhà hàng
 */

const storeStatusService = require('../services/storeStatusService');

async function getStatus(req, res, next) {
  try {
    const status = storeStatusService.getStoreStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { mode } = req.body;
    if (!mode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp chế độ hoạt động (mode: auto, force_open, force_closed).'
      });
    }

    const updater = req.user ? (req.user.name || req.user.email || 'Admin') : 'Admin';
    const updatedStatus = await storeStatusService.setStoreMode(mode, updater);

    // Đồng bộ tức thời tới toàn bộ máy khách và các tab qua Socket.IO
    const io = req.app && req.app.get ? req.app.get('io') : null;
    if (io) {
      io.emit('store:status_change', updatedStatus);
    }

    res.json({
      success: true,
      message: 'Cập nhật trạng thái nhà hàng thành công!',
      data: updatedStatus
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  updateStatus
};
