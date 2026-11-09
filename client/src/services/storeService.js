/**
 * STORE SERVICE — VỊ NHÀ MÌNH
 * Quản lý trạng thái hoạt động mở/đóng cửa của nhà hàng trên Frontend
 * Đồng bộ với Backend API /api/store/status và Socket.IO sự kiện 'store:status_change'
 */

let cachedStatus = {
  mode: 'auto', // 'auto', 'force_open', 'force_closed'
  is_open: true,
  message: '',
  operating_hours: {
    open: '09:00',
    close: '22:00',
    order_open: '09:00',
    order_close: '21:30',
    last_order: '21:30'
  }
};

// Đọc từ localStorage nếu có cache từ phiên trước
try {
  const saved = localStorage.getItem('vnm_store_status');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') {
      cachedStatus = { ...cachedStatus, ...parsed };
    }
  }
} catch (_) {}

/**
 * Kiểm tra xem hiện tại có đang trong khung giờ nhận đơn tự động (09:00 - 21:30) hay không
 */
export function isWithinAutoHours() {
  const now = new Date();
  const vnParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(vnParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(vnParts.find(p => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 540 && totalMinutes < 1290;
}

/**
 * Kiểm tra xem khách hàng có được phép đặt đơn hay không
 * QUY TẮC:
 * - Khi mode === 'force_open' (Quản trị viên mở): LUÔN ĐƯỢC ĐẶT ĐƠN dù là mấy giờ
 * - Khi mode === 'force_closed' (Quản trị viên đóng): KHÔNG ĐƯỢC ĐẶT ĐƠN dù là trong giờ hoạt động
 * - Khi mode === 'auto' (Tự động theo giờ): Đặt được nếu trong khung giờ 09:00 - 21:30
 */
export function isOrderingAllowed() {
  if (cachedStatus.mode === 'force_open') {
    return true;
  }
  if (cachedStatus.mode === 'force_closed') {
    return false;
  }
  return isWithinAutoHours();
}

/**
 * Lấy thông báo giải thích trạng thái đặt món
 */
export function getOrderingMessage() {
  if (cachedStatus.mode === 'force_closed') {
    return '⛔ Nhà hàng tạm đóng cửa nhận đơn theo chỉ đạo của Quản trị viên. Quý khách vui lòng quay lại sau!';
  }
  if (!isOrderingAllowed()) {
    return '⛔ Bếp đã đóng cửa nhận đơn (sau 21:30). Vui lòng đặt món trong khung giờ 09:00 – 21:30.';
  }
  return '';
}

/**
 * Lấy trạng thái hiện tại
 */
export function getStoreStatus() {
  return {
    ...cachedStatus,
    is_open: isOrderingAllowed()
  };
}

/**
 * Cập nhật trạng thái từ bên ngoài (API response hoặc Socket.IO)
 */
export function updateStoreStatus(data) {
  if (!data || typeof data !== 'object') return;
  const newMode = data.mode || cachedStatus.mode;
  const newIsOpen = newMode === 'force_open'
    ? true
    : (newMode === 'force_closed' ? false : (typeof data.is_open === 'boolean' ? data.is_open : isWithinAutoHours()));

  cachedStatus = {
    ...cachedStatus,
    ...data,
    mode: newMode,
    is_open: newIsOpen
  };

  try {
    localStorage.setItem('vnm_store_status', JSON.stringify(cachedStatus));
  } catch (_) {}

  // Phát event để các thành phần UI (CartDrawer, Header Pill, etc.) tự động cập nhật
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('store:status_updated', { detail: cachedStatus }));
  }
}

/**
 * Gọi API lấy trạng thái mới nhất từ server
 */
export async function fetchStoreStatus() {
  try {
    const res = await fetch('/api/store/status');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        updateStoreStatus(json.data);
        return cachedStatus;
      }
    }
  } catch (_) {}
  return cachedStatus;
}

// Tự động lắng nghe Socket.IO sự kiện realtime 'store:status_change' (kết nối sau khi trang đã tải xong để không chặn luồng mạng ban đầu)
if (typeof window !== 'undefined') {
  const setupSocket = () => {
    if (typeof window.io === 'function' && !window.__storeStatusSocketInit) {
      try {
        const socket = window.io({ transports: ['websocket', 'polling'] });
        socket.on('store:status_change', (data) => {
          updateStoreStatus(data);
        });
        window.__storeStatusSocketInit = true;
      } catch (_) {}
    }
  };

  if (document.readyState === 'complete') {
    setupSocket();
  } else {
    window.addEventListener('load', () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(setupSocket, { timeout: 2000 });
      } else {
        setTimeout(setupSocket, 400);
      }
    });
  }
}
