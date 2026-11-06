/**
 * ORDER TRACKING MODAL (Mục 8: Theo dõi đơn hàng thời gian thực & Hủy đơn)
 * Áp dụng skills: frontend-developer, ui-ux-designer
 */

import { api } from '../../services/api.js';
import { authService } from '../../services/auth.js';
import { formatCurrency, formatDate, escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { showToast } from '../../components/Toast.js';

let trackingModalEl = null;
let cancelModalEl = null;
let activeOrderCode = null;
let currentOrderData = null;
let availableOrders = [];
let pollTimer = null;
let trackingSocket = null;

function setupTrackingSocket() {
  if (typeof window.io === 'function' && !trackingSocket) {
    try {
      trackingSocket = window.io();
      trackingSocket.on('order:status', (data) => {
        if (!data || !activeOrderCode) return;
        if (data.orderCode === activeOrderCode || (currentOrderData && data.orderId === currentOrderData.id)) {
          fetchAndRenderOrder();
        }
      });
      trackingSocket.on('order:item_status', (data) => {
        if (!data || !activeOrderCode) return;
        if (data.orderCode === activeOrderCode || (currentOrderData && data.orderId === currentOrderData.id)) {
          fetchAndRenderOrder();
        }
      });
    } catch (e) {
      console.warn('Socket realtime cho tracking không khả dụng.', e);
    }
  }
}

const STATUS_STEPS = [
  { key: 'received', label: 'Đã nhận đơn', icon: '📝' },
  { key: 'cooking', label: 'Đang nấu', icon: '👨‍🍳' },
  { key: 'ready', label: 'Sẵn sàng', icon: '🍽️' },
  { key: 'serving', label: 'Đang phục vụ / Giao', icon: '🛵' },
  { key: 'completed', label: 'Hoàn tất', icon: '🎉' }
];

export async function openOrderTrackingModal(orderCode, orderList = null) {
  activeOrderCode = orderCode;

  if (orderCode) {
    try {
      localStorage.setItem('vnm_last_order_code', orderCode);
    } catch (_) {}
  }

  if (orderList && Array.isArray(orderList)) {
    availableOrders = orderList;
  } else {
    const user = authService.getCurrentUser();
    if (user) {
      try {
        const res = await api.get('/orders/my-orders');
        availableOrders = res.data || [];
      } catch {
        availableOrders = [];
      }
    } else {
      let guestCodes = [];
      try {
        guestCodes = JSON.parse(localStorage.getItem('vnm_guest_orders') || '[]');
      } catch (_) {}
      if (orderCode && !guestCodes.includes(orderCode)) {
        guestCodes.unshift(orderCode);
        try { localStorage.setItem('vnm_guest_orders', JSON.stringify(guestCodes)); } catch (_) {}
      }
      availableOrders = guestCodes.map(c => ({ order_code: c }));
    }
  }

  if (!trackingModalEl) {
    trackingModalEl = document.createElement('div');
    trackingModalEl.className = 'modal-backdrop';
    document.body.appendChild(trackingModalEl);

    trackingModalEl.addEventListener('click', (e) => {
      if (e.target === trackingModalEl) closeOrderTrackingModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && trackingModalEl.classList.contains('active')) {
        closeOrderTrackingModal();
      }
    });
  }

  fetchAndRenderOrder();
  setupTrackingSocket();
  if (!trackingModalEl.classList.contains('active')) {
    trackingModalEl.classList.add('active');
    lockScroll();
  }

  // Polling cập nhật mỗi 4 giây
  clearInterval(pollTimer);
  pollTimer = setInterval(fetchAndRenderOrder, 4000);
}

export function closeOrderTrackingModal() {
  if (trackingModalEl && trackingModalEl.classList.contains('active')) {
    trackingModalEl.classList.remove('active');
    unlockScroll();
  }
  clearInterval(pollTimer);
}

/** Mở theo dõi đơn hàng gần nhất (Task 5) */
export async function openRecentOrderStatus() {
  const currentUser = authService.getCurrentUser();

  // 1. Nếu tài khoản đã đăng nhập
  if (currentUser) {
    try {
      const res = await api.get('/orders/my-orders');
      if (res.data && res.data.length > 0) {
        availableOrders = res.data;
        openOrderTrackingModal(res.data[0].order_code, res.data);
        return;
      }
    } catch (err) {
      console.warn('Lỗi lấy đơn cá nhân:', err);
    }

    if (currentUser.role === 'admin' || currentUser.role === 'staff') {
      showToast('Tài khoản Quản trị / Nhân viên chưa có đơn hàng cá nhân nào. Hãy kiểm tra màn hình Bếp KDS hoặc Sơ đồ bàn để quản lý đơn của khách!', 'info', 5000);
    } else {
      showToast('Bạn chưa có đơn hàng nào gần đây. Hãy chọn món và đặt hàng nhé!', 'info');
    }
    return;
  }

  // 2. Khách vãng lai (Guest) chưa đăng nhập: lấy danh sách đơn từ máy khách
  let guestCodes = [];
  try {
    guestCodes = JSON.parse(localStorage.getItem('vnm_guest_orders') || '[]');
  } catch (_) {}

  if (guestCodes.length > 0) {
    availableOrders = guestCodes.map(code => ({ order_code: code }));
    openOrderTrackingModal(guestCodes[0], availableOrders);
    return;
  }

  showToast('Bạn chưa có đơn hàng nào gần đây. Hãy chọn món và đặt hàng nhé!', 'info');
}

async function fetchAndRenderOrder() {
  if (!activeOrderCode) return;
  try {
    const res = await api.get(`/orders/track/${encodeURIComponent(activeOrderCode)}`);
    if (res.data) {
      renderTrackingContent(res.data);
    }
  } catch (err) {
    if (err && (err.status === 403 || (err.message && err.message.includes('quyền')))) {
      clearInterval(pollTimer);
      if (trackingModalEl) {
        trackingModalEl.innerHTML = `
          <div class="modal-box" style="max-width: 460px; text-align: center; padding: var(--space-6);">
            <div style="font-size: 2.5rem; margin-bottom: var(--space-2);">🔒</div>
            <h3 style="font-size: 1.15rem; margin-bottom: var(--space-2);">Không có quyền truy cập đơn hàng</h3>
            <p style="font-size: 0.88rem; color: var(--color-text-muted); margin-bottom: var(--space-5);">
              ${escapeHtml(err.message || 'Đơn hàng này thuộc tài khoản khách hàng khác hoặc yêu cầu xác thực số điện thoại.')}
            </p>
            <button id="btn-close-tracking-denied" class="btn btn-primary" style="margin: 0 auto; display: inline-flex;">
              Đóng cửa sổ
            </button>
          </div>
        `;
        const b = trackingModalEl.querySelector('#btn-close-tracking-denied');
        if (b) b.addEventListener('click', closeOrderTrackingModal);
      }
      return;
    }
    console.error('Lỗi track order:', err);
  }
}

function renderTrackingContent(order) {
  currentOrderData = order;
  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);

  trackingModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 600px;">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.3rem;">📦</span>
          <div>
            <h3 style="font-size: 1.15rem; margin: 0;">Theo Dõi Đơn Hàng: <span style="color: var(--color-primary);">${escapeHtml(order.order_code)}</span></h3>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">${formatDate(order.created_at)}</span>
          </div>
        </div>
        <button id="btn-close-tracking" class="btn-icon" title="Đóng">&times;</button>
      </div>

      ${availableOrders && availableOrders.length > 1 ? `
        <div style="background: var(--color-surface-alt); padding: 8px 16px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted); white-space: nowrap; flex-shrink: 0;">
            Đơn của bạn (${availableOrders.length}):
          </span>
          ${availableOrders.map(o => {
            const isSel = o.order_code === order.order_code;
            return `
              <button
                type="button"
                class="btn btn-sm ${isSel ? 'btn-primary' : 'btn-outline'} btn-switch-order"
                data-code="${escapeHtml(o.order_code)}"
                style="padding: 3px 10px; font-size: 0.75rem; border-radius: var(--radius-full); white-space: nowrap; flex-shrink: 0;"
              >
                #${escapeHtml(o.order_code)}
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}

      <div class="modal-body" style="padding: var(--space-6);">
        ${isCancelled ? `
          <div class="empty-state" style="padding: var(--space-4) 0;">
            <div class="empty-icon" style="color: var(--color-danger);">❌</div>
            <div class="empty-title" style="color: var(--color-danger);">Đơn Hàng Đã Bị Hủy</div>
            <div class="empty-desc">Lý do: ${escapeHtml(order.cancel_reason || 'Khách hàng yêu cầu hủy')}</div>
          </div>
        ` : `
          <!-- Thanh tiến trình trạng thái thời gian thực -->
          <div style="margin-bottom: var(--space-6);">
            <div style="display: flex; justify-content: space-between; position: relative;">
              <!-- Đường line nối giữa các bước -->
              <div style="position: absolute; top: 18px; left: 10%; right: 10%; height: 3px; background-color: var(--color-border); z-index: 1;"></div>
              
              ${STATUS_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return `
                  <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 18%;">
                    <div 
                      style="
                        width: 38px; height: 38px; border-radius: var(--radius-full); 
                        display: flex; align-items: center; justify-content: center; font-size: 1rem;
                        background-color: ${isPassed ? 'var(--color-primary)' : 'var(--color-surface)'};
                        color: ${isPassed ? '#fff' : 'var(--color-text-muted)'};
                        border: 2px solid ${isPassed ? 'var(--color-primary)' : 'var(--color-border)'};
                        ${isCurrent ? 'box-shadow: var(--shadow-glow); transform: scale(1.15);' : ''}
                        transition: all var(--transition-normal);
                      "
                    >
                      ${step.icon}
                    </div>
                    <span 
                      style="
                        font-size: 0.725rem; font-weight: ${isCurrent ? '700' : '500'}; 
                        margin-top: 6px; text-align: center; line-height: 1.2;
                        color: ${isCurrent ? 'var(--color-primary)' : 'var(--color-text-muted)'};
                      "
                    >
                      ${step.label}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Thông tin ước tính thời gian -->
          <div class="card" style="padding: var(--space-3) var(--space-4); background-color: var(--color-surface-alt); margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
            <div class="flex items-center gap-2">
              <span style="font-size: 1.4rem;">⏱️</span>
              <div>
                <div style="font-weight: 700; font-size: 0.9rem;">Thời gian ước tính: ~${order.estimated_minutes || 20} phút</div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted);">
                  ${order.table_number ? `Bàn: ${escapeHtml(order.table_number)}` : (order.order_type === 'delivery' ? `Giao đến: ${escapeHtml(order.delivery_address || 'Địa chỉ đã ghi')}` : 'Mang đi')}
                </div>
              </div>
            </div>
            <span class="badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">
              ${order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </span>
          </div>
        `}

        <!-- Danh sách món đã đặt (T2.6: Cập nhật trạng thái từng món) -->
        <h4 style="font-size: 0.95rem; margin-bottom: var(--space-2);">Chi Tiết Tiến Độ Món Ăn (${(order.items || []).length}):</h4>
        <div class="flex flex-col gap-2" style="max-height: 220px; overflow-y: auto; margin-bottom: var(--space-4);">
          ${(order.items || []).map(it => {
            const itemStatus = it.item_status || 'received';
            let badgeHtml = '<span class="badge badge-secondary" style="font-size: 0.7rem;">Chờ nấu</span>';
            if (itemStatus === 'cooking') {
              badgeHtml = '<span class="badge badge-amber" style="font-size: 0.7rem;">🔥 Đang nấu</span>';
            } else if (itemStatus === 'ready') {
              badgeHtml = '<span class="badge" style="background-color: #dbeafe; color: #1e40af; font-size: 0.7rem;">🍽️ Đã xong</span>';
            } else if (itemStatus === 'serving') {
              badgeHtml = '<span class="badge badge-primary" style="font-size: 0.7rem;">🛎️ Đang bưng món</span>';
            } else if (itemStatus === 'completed') {
              badgeHtml = '<span class="badge badge-success" style="font-size: 0.7rem;">✅ Đã phục vụ</span>';
            }

            return `
              <div class="flex items-center justify-between" style="font-size: 0.875rem; padding: 6px 0; border-bottom: 1px dashed var(--color-border);">
                <div>
                  <div class="flex items-center gap-2">
                    <span style="font-weight: 600;">${it.quantity}x ${escapeHtml(it.dish_name)}</span>
                    ${badgeHtml}
                  </div>
                  ${it.spice_level > 0 ? `<span style="font-size: 0.75rem; color: var(--color-primary);"> (Cay C${it.spice_level})</span>` : ''}
                  ${it.note ? `<div style="font-size: 0.75rem; color: var(--color-text-muted);">"${escapeHtml(it.note)}"</div>` : ''}
                </div>
                <span style="font-weight: 700;">${formatCurrency(it.item_total)}</span>
              </div>
            `;
          }).join('')}
        </div>

        ${order.status === 'completed' ? `
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: var(--radius-md); padding: var(--space-3); margin-bottom: var(--space-3); text-align: center; font-weight: 600; font-size: 0.875rem;">
            🎉 Toàn bộ món ăn đã được phục vụ! Chúc quý khách dùng bữa ngon miệng!
          </div>
        ` : ''}

        <div class="flex justify-between" style="font-size: 1.1rem; font-weight: 800; border-top: 1px solid var(--color-border); padding-top: var(--space-3);">
          <span>Tổng đơn hàng:</span>
          <span style="color: var(--color-primary);">${formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      <div class="modal-footer" style="justify-content: space-between;">
        <div class="flex items-center gap-2">
          <a href="/hoa-don.html?code=${encodeURIComponent(order.order_code)}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration: none;">
            🧾 Hóa đơn VAT
          </a>
          ${order.status === 'received' && !isCancelled ? `
            <button id="btn-cancel-my-order" class="btn btn-sm btn-danger">
              ❌ Hủy Đơn
            </button>
          ` : ''}
        </div>

        <button id="btn-close-tracking-footer" class="btn btn-secondary btn-sm">
          Đóng
        </button>
      </div>
    </div>
  `;

  const closeBtn = trackingModalEl.querySelector('#btn-close-tracking');
  const closeFooterBtn = trackingModalEl.querySelector('#btn-close-tracking-footer');
  if (closeBtn) closeBtn.addEventListener('click', closeOrderTrackingModal);
  if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeOrderTrackingModal);

  // Chuyển đổi qua lại giữa các đơn hàng của khách
  trackingModalEl.querySelectorAll('.btn-switch-order').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCode = btn.getAttribute('data-code');
      if (targetCode && targetCode !== activeOrderCode) {
        activeOrderCode = targetCode;
        fetchAndRenderOrder();
      }
    });
  });

  // Nút hủy đơn khi chưa nấu (Task 5: Modal riêng thay prompt)
  const cancelBtn = trackingModalEl.querySelector('#btn-cancel-my-order');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      openCancelOrderModal(order, () => {
        fetchAndRenderOrder();
      });
    });
  }
}

/** Đóng modal xác nhận hủy đơn */
function closeCancelOrderModal() {
  if (cancelModalEl) {
    cancelModalEl.classList.remove('active');
    cancelModalEl.remove();
    cancelModalEl = null;
  }
}

/** Modal chọn lý do hủy đơn (Task 5) */
function openCancelOrderModal(order, onSuccess) {
  closeCancelOrderModal();

  cancelModalEl = document.createElement('div');
  cancelModalEl.className = 'modal-backdrop active';
  cancelModalEl.style.zIndex = '1060';

  cancelModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 480px;">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.3rem;">⚠️</span>
          <h3 style="font-size: 1.15rem; margin: 0;">Xác Nhận Hủy Đơn Hàng</h3>
        </div>
        <button id="btn-close-cancel-modal" class="btn-icon" title="Đóng">&times;</button>
      </div>

      <div class="modal-body" style="padding: var(--space-5);">
        <p style="margin-bottom: var(--space-4); font-size: 0.9rem; color: var(--color-text-main); line-height: 1.5;">
          Bạn có chắc chắn muốn hủy đơn <strong>#${escapeHtml(order.order_code)}</strong>? Vui lòng chọn lý do để nhà hàng ghi nhận và phục vụ bạn tốt hơn:
        </p>

        <div class="flex flex-col gap-3" style="margin-bottom: var(--space-4);">
          <label class="flex items-center gap-2" style="cursor: pointer; font-size: 0.9rem;">
            <input type="radio" name="cancel_reason" value="Tôi muốn đổi món" checked />
            <span>Tôi muốn đổi món</span>
          </label>
          <label class="flex items-center gap-2" style="cursor: pointer; font-size: 0.9rem;">
            <input type="radio" name="cancel_reason" value="Đặt nhầm" />
            <span>Đặt nhầm món / nhầm số lượng</span>
          </label>
          <label class="flex items-center gap-2" style="cursor: pointer; font-size: 0.9rem;">
            <input type="radio" name="cancel_reason" value="Chờ quá lâu" />
            <span>Thời gian chờ quá lâu</span>
          </label>
          <label class="flex items-center gap-2" style="cursor: pointer; font-size: 0.9rem;">
            <input type="radio" name="cancel_reason" value="other" id="radio-reason-other" />
            <span>Lý do khác</span>
          </label>
        </div>

        <div id="cancel-custom-reason-wrap" style="display: none; margin-bottom: var(--space-2);">
          <textarea
            id="cancel-custom-reason-input"
            rows="3"
            placeholder="Nhập lý do chi tiết của bạn..."
            style="width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px 12px; font-size: 0.9rem; background: var(--color-surface); color: var(--color-text-main); resize: vertical;"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer" style="justify-content: flex-end; gap: var(--space-2);">
        <button type="button" id="btn-back-cancel-modal" class="btn btn-secondary btn-sm">
          Quay Lại
        </button>
        <button type="button" id="btn-confirm-cancel-order" class="btn btn-danger btn-sm">
          Xác Nhận Hủy Đơn
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(cancelModalEl);

  // Xử lý hiển thị textarea khi chọn "Lý do khác"
  const radioInputs = cancelModalEl.querySelectorAll('input[name="cancel_reason"]');
  const customReasonWrap = cancelModalEl.querySelector('#cancel-custom-reason-wrap');
  const customReasonInput = cancelModalEl.querySelector('#cancel-custom-reason-input');

  radioInputs.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'other') {
        customReasonWrap.style.display = 'block';
        if (customReasonInput) customReasonInput.focus();
      } else {
        customReasonWrap.style.display = 'none';
      }
    });
  });

  // Đóng modal hủy đơn
  const closeBtn = cancelModalEl.querySelector('#btn-close-cancel-modal');
  const backBtn = cancelModalEl.querySelector('#btn-back-cancel-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeCancelOrderModal);
  if (backBtn) backBtn.addEventListener('click', closeCancelOrderModal);

  cancelModalEl.addEventListener('click', (e) => {
    if (e.target === cancelModalEl) closeCancelOrderModal();
  });

  // Xác nhận hủy đơn
  const confirmBtn = cancelModalEl.querySelector('#btn-confirm-cancel-order');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const selectedRadio = cancelModalEl.querySelector('input[name="cancel_reason"]:checked');
      let finalReason = selectedRadio ? selectedRadio.value : 'Tôi muốn đổi món';

      if (finalReason === 'other') {
        const customText = customReasonInput ? customReasonInput.value.trim() : '';
        finalReason = customText || 'Lý do khác';
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Đang xử lý...';

      try {
        await api.post(`/orders/${order.id}/cancel`, {
          reason: finalReason,
          order_code: order.order_code,
          phone: order.customer_phone
        });
        showToast('Đã hủy đơn hàng thành công.', 'info');
        closeCancelOrderModal();
        if (typeof onSuccess === 'function') onSuccess();
      } catch (err) {
        showToast(err.message || 'Không thể hủy đơn hàng.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Xác Nhận Hủy Đơn';
      }
    });
  }
}
