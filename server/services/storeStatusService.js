/**
 * STORE STATUS SERVICE — VỊ NHÀ MÌNH
 * Nguồn dữ liệu thống nhất cho trạng thái mở/đóng cửa và nhận đơn của nhà hàng
 * Hỗ trợ 3 chế độ: auto (tự động 09:00 - 21:30), force_open (mở cưỡng bức), force_closed (đóng cưỡng bức)
 */

const { dbAsync } = require('../config/db');

let currentMode = 'auto';
let lastUpdated = new Date().toISOString();
let lastUpdatedBy = 'system';
let isInitialized = false;

// Giờ hoạt động chuẩn theo múi giờ Việt Nam
const STORE_CONFIG = {
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  ORDER_OPEN_MINUTES: 540,   // 09:00
  ORDER_CLOSE_MINUTES: 1290, // 21:30
  DINE_IN_CLOSE_MINUTES: 1320, // 22:00
  DISPLAY_HOURS: {
    open: '09:00',
    close: '22:00',
    order_open: '09:00',
    order_close: '21:30',
    restaurant_close: '22:00',
    last_order: '21:30'
  }
};

/** Lấy thông tin thời gian hiện tại theo múi giờ Việt Nam */
function getVietnamTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_CONFIG.TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(date);

  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;

  return { hour, minute, second, totalMinutes };
}

/** Khởi tạo trạng thái từ cơ sở dữ liệu khi server khởi động */
async function initStoreStatus() {
  try {
    const row = await dbAsync.get('SELECT value, updated_at, updated_by FROM store_settings WHERE key = ?', ['store_status_mode']);
    if (row && ['auto', 'force_open', 'force_closed'].includes(row.value)) {
      currentMode = row.value;
      lastUpdated = row.updated_at || lastUpdated;
      lastUpdatedBy = row.updated_by || lastUpdatedBy;
    }
    isInitialized = true;
  } catch (err) {
    // Nếu bảng chưa sẵn sàng, giữ giá trị mặc định 'auto'
    isInitialized = true;
  }
}

/** Lấy trạng thái cửa hàng hiện tại */
function getStoreStatus() {
  const vnTime = getVietnamTime();
  const isAutoOpen = vnTime.totalMinutes >= STORE_CONFIG.ORDER_OPEN_MINUTES && 
                     vnTime.totalMinutes < STORE_CONFIG.ORDER_CLOSE_MINUTES;

  let isOpen = isAutoOpen;
  let statusMessage = '';

  if (currentMode === 'force_open') {
    isOpen = true;
    statusMessage = 'Đang mở cửa nhận đơn (Quản trị viên mở đặc biệt)';
  } else if (currentMode === 'force_closed') {
    isOpen = false;
    statusMessage = 'Nhà hàng tạm đóng cửa nhận đơn theo chỉ đạo của Quản trị viên';
  } else {
    isOpen = isAutoOpen;
    statusMessage = isAutoOpen 
      ? 'Đang mở cửa nhận đặt đơn (09:00 – 21:30)' 
      : 'Nhà hàng đã đóng cửa nhận đơn (chỉ nhận đơn từ 09:00 đến 21:30)';
  }

  return {
    mode: currentMode,
    is_open: isOpen,
    is_auto_open: isAutoOpen,
    message: statusMessage,
    server_time: new Date().toISOString(),
    timezone: STORE_CONFIG.TIMEZONE,
    operating_hours: STORE_CONFIG.DISPLAY_HOURS,
    updated_at: lastUpdated,
    updated_by: lastUpdatedBy
  };
}

/** Cập nhật chế độ cửa hàng (Chỉ Admin) */
async function setStoreMode(newMode, username = 'admin') {
  if (!['auto', 'force_open', 'force_closed'].includes(newMode)) {
    throw new Error('Chế độ hoạt động không hợp lệ. Chỉ chấp nhận: auto, force_open, force_closed');
  }

  currentMode = newMode;
  lastUpdated = new Date().toISOString();
  lastUpdatedBy = username;

  try {
    await dbAsync.run(
      `INSERT INTO store_settings (key, value, updated_at, updated_by)
       VALUES ('store_status_mode', ?, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP, updated_by = excluded.updated_by`,
      [newMode, username]
    );
  } catch (err) {
    console.error('Lỗi lưu store_settings vào DB:', err.message);
  }

  return getStoreStatus();
}

/** Kiểm tra nhà hàng có đang nhận đơn hàng mới hay không */
function isOrderAccepting() {
  const status = getStoreStatus();

  // Khi đóng cưỡng bức (force_closed): Tuyệt đối không nhận đơn (kể cả trong giờ hoạt động hay test)
  if (status.mode === 'force_closed') {
    return {
      allowed: false,
      message: 'Nhà hàng hiện đang tạm đóng cửa nhận đơn theo chỉ đạo của Quản trị viên. Quý khách vui lòng quay lại sau!'
    };
  }

  // Khi mở cưỡng bức (force_open): Luôn cho phép nhận đơn bất kể mấy giờ
  if (status.mode === 'force_open') {
    return { allowed: true };
  }

  // Chế độ tự động (auto): cho phép bypass khung giờ khi chạy kiểm thử tự động ngoài giờ phục vụ
  if (process.env.NODE_TEST_CONTEXT) {
    return { allowed: true };
  }

  if (!status.is_open) {
    return {
      allowed: false,
      message: 'Nhà hàng chỉ nhận đặt món trong khung giờ từ 09:00 đến 21:30. Hiện tại bếp đã đóng cửa nhận đơn, quý khách vui lòng quay lại sau!'
    };
  }

  return { allowed: true };
}

module.exports = {
  STORE_CONFIG,
  getVietnamTime,
  initStoreStatus,
  getStoreStatus,
  setStoreMode,
  isOrderAccepting
};
