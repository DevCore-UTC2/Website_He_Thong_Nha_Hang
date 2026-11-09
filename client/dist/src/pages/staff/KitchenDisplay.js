/**
 * KITCHEN DISPLAY SYSTEM (Mục 9: Màn hình điều phối Bếp & Giao hàng)
 * Áp dụng skills: frontend-developer, ui-ux-designer
 */

import { api } from '../../services/api.js';
import { authService } from '../../services/auth.js';
import { openAuthModal } from '../../components/AuthModal.js';
import { formatCurrency, formatDate, escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { showToast } from '../../components/Toast.js';

let kitchenModalEl = null;
let kitchenItems = [];
let pollInterval = null;
let kitchenSocket = null;
const fadingItems = new Map(); // id -> { item, startTime } (T2.5)

function setupKitchenSocket() {
  if (typeof window.io === 'function' && !kitchenSocket) {
    try {
      kitchenSocket = window.io();
      const token = authService.getToken() || localStorage.getItem('vnm_token') || localStorage.getItem('vinhaminh_token') || localStorage.getItem('smartbite_token');
      if (token) {
        kitchenSocket.emit('join:room', { room: 'kitchen', token });
        kitchenSocket.emit('join:room', { room: 'staff', token });
      }
      kitchenSocket.on('order:new', () => {
        loadKitchenData(true);
        showToast('Có món mới gửi đến bếp!', 'info');
      });
      kitchenSocket.on('order:status', () => {
        loadKitchenData(true);
      });
      kitchenSocket.on('order:item_status', () => {
        loadKitchenData(true);
      });
    } catch (e) {
      console.warn('Socket realtime không khả dụng, dùng chế độ tự động làm mới.', e);
    }
  }
}

function ensureKitchenModalShell() {
  if (!kitchenModalEl) {
    kitchenModalEl = document.createElement('div');
    kitchenModalEl.className = 'modal-backdrop';
    document.body.appendChild(kitchenModalEl);

    kitchenModalEl.addEventListener('click', (e) => {
      if (e.target === kitchenModalEl) closeKitchenDisplay();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && kitchenModalEl.classList.contains('active')) {
        closeKitchenDisplay();
      }
    });
  }

  let box = kitchenModalEl.querySelector('.modal-box');
  if (!box) {
    kitchenModalEl.innerHTML = `
      <div class="modal-box" style="max-width: 1280px; width: 96vw; max-height: 94vh; max-height: 94dvh;">
        <div class="modal-header">
          <div class="flex items-center gap-3">
            <span style="font-size: 1.5rem;">👨‍🍳</span>
            <div>
              <h3 style="font-size: 1.25rem;">Hệ Thống Màn Hình Bếp (Kitchen Display)</h3>
              <p style="font-size: 0.85rem; margin: 0;">Điều phối chế biến và bàn giao món ăn theo thời gian thực (4 bước)</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-refresh-kitchen" class="btn btn-secondary btn-sm">🔄 Làm mới</button>
            <button id="btn-close-kitchen" class="btn-icon" title="Đóng">&times;</button>
          </div>
        </div>

        <div class="modal-body" style="padding: var(--space-4); background-color: var(--color-surface-alt);">
          <!-- 4 Cột Kanban (T2.4 & T2.7: Cố định khung, chống nhấp nháy UI khi tự động làm mới) -->
          <div id="kitchen-kanban-grid" class="kanban-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: var(--space-4); align-items: start;">
            
            <!-- Cột 1: CHƯA NẤU -->
            <div class="card" style="padding: var(--space-3); border-top: 4px solid var(--color-warning);">
              <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
                <h4 id="title-col-unstarted" style="font-size: 0.95rem; color: var(--color-warning); font-weight: 700;">⏳ CHƯA NẤU (0)</h4>
                <span class="badge badge-warning">Chờ nấu</span>
              </div>
              <div id="container-col-unstarted" class="flex flex-col gap-3"></div>
            </div>

            <!-- Cột 2: ĐANG NẤU -->
            <div class="card" style="padding: var(--space-3); border-top: 4px solid var(--color-primary);">
              <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
                <h4 id="title-col-cooking" style="font-size: 0.95rem; color: var(--color-primary); font-weight: 700;">🔥 ĐANG NẤU (0)</h4>
                <span class="badge badge-amber">Bếp đang làm</span>
              </div>
              <div id="container-col-cooking" class="flex flex-col gap-3"></div>
            </div>

            <!-- Cột 3: ĐÃ NẤU XONG -->
            <div class="card" style="padding: var(--space-3); border-top: 4px solid #3b82f6;">
              <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
                <h4 id="title-col-ready" style="font-size: 0.95rem; color: #2563eb; font-weight: 700;">🍽️ ĐÃ NẤU XONG (0)</h4>
                <span class="badge" style="background-color: #dbeafe; color: #1e40af;">Nấu xong</span>
              </div>
              <div id="container-col-ready" class="flex flex-col gap-3"></div>
            </div>

            <!-- Cột 4: CHỜ PHỤC VỤ (T2.5) -->
            <div class="card" style="padding: var(--space-3); border-top: 4px solid var(--color-success);">
              <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
                <h4 id="title-col-serving" style="font-size: 0.95rem; color: var(--color-success); font-weight: 700;">🛎️ CHỜ PHỤC VỤ (0)</h4>
                <span class="badge badge-success">Chờ bưng món</span>
              </div>
              <div id="container-col-serving" class="flex flex-col gap-3"></div>
            </div>

          </div>
        </div>
      </div>
    `;

    attachStaticKitchenEvents();
  }
}

export function openKitchenDisplay() {
  const user = authService.getCurrentUser();
  const token = authService.getToken() || localStorage.getItem('vnm_token');

  if (!token || !user) {
    showToast('Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc.', 'warning');
    openAuthModal('login');
    return;
  }

  if (user.role !== 'admin' && user.role !== 'staff') {
    showToast('Tài khoản của bạn không có quyền truy cập Màn hình bếp.', 'error');
    return;
  }

  ensureKitchenModalShell();

  if (!kitchenModalEl.classList.contains('active')) {
    kitchenModalEl.classList.add('active');
    lockScroll();
  }
  loadKitchenData();
  setupKitchenSocket();

  clearInterval(pollInterval);
  // Tự động làm mới mỗi 5 giây không gây nhấp nháy UI (T2.7)
  pollInterval = setInterval(() => loadKitchenData(true), 5000);
}

export function closeKitchenDisplay() {
  if (kitchenModalEl && kitchenModalEl.classList.contains('active')) {
    kitchenModalEl.classList.remove('active');
    unlockScroll();
  }
  clearInterval(pollInterval);
  pollInterval = null;
}

async function loadKitchenData(silent = false) {
  try {
    const res = await api.get('/orders/kitchen');
    const rawData = res.data || [];
    if (rawData.length > 0 && Array.isArray(rawData[0].items)) {
      kitchenItems = rawData.flatMap(ord => (ord.items || []).map(it => ({
        ...it,
        order_id: ord.id,
        order_code: ord.order_code,
        table_number: ord.table_number,
        order_type: ord.order_type,
        customer_name: ord.customer_name,
        created_at: ord.created_at,
        item_status: it.item_status || ord.status || 'received'
      })));
    } else {
      kitchenItems = rawData;
    }
    renderKitchenUI();
  } catch (err) {
    console.error('Lỗi tải dữ liệu bếp:', err);
    if (!silent) {
      closeKitchenDisplay();
      showToast(err.message || 'Phiên làm việc đã kết thúc. Vui lòng đăng nhập lại.', 'warning');
      openAuthModal('login');
    }
  }
}

function renderKitchenUI() {
  ensureKitchenModalShell();

  // Sắp xếp món cũ nhất lên trước (T2.4)
  const sortedItems = [...kitchenItems].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0) || a.id - b.id);

  // 4 Cột / Nhóm trạng thái (T2.4)
  const unstartedItems = sortedItems.filter(i => (i.item_status || 'received') === 'received' || i.item_status === 'not_started');
  const cookingItems = sortedItems.filter(i => i.item_status === 'cooking');
  const readyItems = sortedItems.filter(i => i.item_status === 'ready');
  
  // Lấy các món đang ở bước serving chưa bị bấm hoàn tất, cộng thêm các món đang fading 5 giây (T2.5)
  const currentServing = sortedItems.filter(i => i.item_status === 'serving' && !fadingItems.has(Number(i.id)));
  const fadingServing = Array.from(fadingItems.values()).map(f => ({ ...f.item, isFading: true }));
  const servingItems = [...currentServing, ...fadingServing];

  // Cập nhật số lượng tiêu đề cột (T2.7: Chỉ thay đổi chữ số, không nhấp nháy giao diện)
  updateColTitle('title-col-unstarted', `⏳ CHƯA NẤU (${unstartedItems.length})`);
  updateColTitle('title-col-cooking', `🔥 ĐANG NẤU (${cookingItems.length})`);
  updateColTitle('title-col-ready', `🍽️ ĐÃ NẤU XONG (${readyItems.length})`);
  updateColTitle('title-col-serving', `🛎️ CHỜ PHỤC VỤ (${servingItems.length})`);

  // Cập nhật nội dung từng cột CHỈ KHI HTML có thay đổi (chống nhấp nháy UI - T2.7)
  const htmlUnstarted = unstartedItems.length === 0 
    ? '<div style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: var(--space-4); background: var(--color-surface); border-radius: var(--radius-md); border: 1px dashed var(--color-border);">Chưa có món nào cần nấu</div>' 
    : unstartedItems.map(it => renderItemCard(it, 'unstarted')).join('');

  const htmlCooking = cookingItems.length === 0 
    ? '<div style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: var(--space-4); background: var(--color-surface); border-radius: var(--radius-md); border: 1px dashed var(--color-border);">Bếp đang trống</div>' 
    : cookingItems.map(it => renderItemCard(it, 'cooking')).join('');

  const htmlReady = readyItems.length === 0 
    ? '<div style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: var(--space-4); background: var(--color-surface); border-radius: var(--radius-md); border: 1px dashed var(--color-border);">Chưa có món xong</div>' 
    : readyItems.map(it => renderItemCard(it, 'ready')).join('');

  const htmlServing = servingItems.length === 0 
    ? '<div style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: var(--space-4); background: var(--color-surface); border-radius: var(--radius-md); border: 1px dashed var(--color-border);">Không có món chờ bưng</div>' 
    : servingItems.map(it => renderItemCard(it, 'serving')).join('');

  updateColumnContainer('container-col-unstarted', htmlUnstarted);
  updateColumnContainer('container-col-cooking', htmlCooking);
  updateColumnContainer('container-col-ready', htmlReady);
  updateColumnContainer('container-col-serving', htmlServing);
}

function updateColTitle(id, text) {
  if (!kitchenModalEl) return;
  const el = kitchenModalEl.querySelector(`#${id}`);
  if (el && el.textContent !== text) {
    el.textContent = text;
  }
}

function updateColumnContainer(containerId, newHtml) {
  if (!kitchenModalEl) return;
  const container = kitchenModalEl.querySelector(`#${containerId}`);
  if (!container) return;
  // So sánh nếu HTML không đổi thì giữ nguyên 100%, không re-render để tránh giật / nhấp nháy UI (T2.7)
  if (container.innerHTML !== newHtml) {
    container.innerHTML = newHtml;
  }
}

function renderItemCard(item, step) {
  let actionBtnText = '';
  let nextStatus = '';
  let btnClass = 'btn-primary';

  if (step === 'unstarted') {
    actionBtnText = '🔥 Bắt đầu nấu';
    nextStatus = 'cooking';
    btnClass = 'btn-primary';
  } else if (step === 'cooking') {
    actionBtnText = '✅ Nấu xong';
    nextStatus = 'ready';
    btnClass = 'btn-primary';
  } else if (step === 'ready') {
    actionBtnText = '🛎️ Chuyển phục vụ';
    nextStatus = 'serving';
    btnClass = 'btn-primary';
  } else if (step === 'serving') {
    actionBtnText = item.isFading ? '✅ Đã phục vụ' : '🎉 Phục vụ ra bàn';
    nextStatus = 'completed';
    btnClass = item.isFading ? 'btn-success' : 'btn-secondary';
  }

  const tableOrType = item.table_number 
    ? escapeHtml(item.table_number) 
    : (item.order_type === 'delivery' ? '🛵 Giao hàng' : (item.order_type === 'dine_in' ? '🍽️ Tại bàn' : '🛍️ Mang đi'));

  const toppings = Array.isArray(item.selected_toppings) ? item.selected_toppings : [];

  return `
    <div class="card kitchen-item-card ${item.isFading ? 'kitchen-item-fading' : ''}" data-item-id="${item.id}" style="padding: var(--space-3); background-color: var(--color-surface); box-shadow: var(--shadow-sm); border-radius: var(--radius-md);">
      <div class="flex justify-between items-center" style="border-bottom: 1px dashed var(--color-border); padding-bottom: var(--space-2); margin-bottom: var(--space-2);">
        <span style="font-weight: 800; font-size: 0.95rem; color: var(--color-primary);">${escapeHtml(item.order_code || 'ORD')}</span>
        <span class="badge badge-secondary" style="font-size: 0.75rem;">
          ${tableOrType}
        </span>
      </div>

      <!-- Thông tin món chi tiết (T2.4) -->
      <div class="flex flex-col gap-1" style="margin-bottom: var(--space-3);">
        <div class="flex justify-between items-start gap-2">
          <span style="font-weight: 700; font-size: 1rem; color: var(--color-text); line-height: 1.35;">
            ${item.quantity}x ${escapeHtml(item.dish_name)}
          </span>
          ${item.spice_level > 0 ? `<span class="badge badge-danger" style="font-size: 0.65rem; white-space: nowrap;">🌶️ Cấp ${item.spice_level}</span>` : ''}
        </div>
        ${toppings.length > 0 ? `
          <div style="font-size: 0.775rem; color: var(--color-primary);">+ ${toppings.map(t => escapeHtml(typeof t === 'string' ? t : (t.name || t.topping_name || ''))).filter(Boolean).join(', ')}</div>
        ` : ''}
        ${item.note ? `<div style="font-size: 0.8rem; color: var(--color-danger); font-weight: 600;">📝 "${escapeHtml(item.note)}"</div>` : ''}
      </div>

      <div class="flex justify-between items-center" style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: var(--space-2);">
        <span>🕒 ${formatDate(item.created_at)}</span>
        ${item.customer_name ? `<span>👤 ${escapeHtml(item.customer_name)}</span>` : ''}
      </div>

      <div class="flex justify-between items-center gap-2" style="border-top: 1px solid var(--color-border); padding-top: var(--space-2);">
        <button class="btn btn-sm btn-secondary btn-print-ticket" data-code="${escapeHtml(item.order_code || '')}" title="In phiếu món">
          🖨️ In
        </button>
        <button class="btn btn-sm ${btnClass} btn-change-status" data-id="${item.id}" data-status="${nextStatus}" ${item.isFading ? 'disabled' : ''}>
          ${actionBtnText}
        </button>
      </div>
    </div>
  `;
}

function attachStaticKitchenEvents() {
  const closeBtn = kitchenModalEl.querySelector('#btn-close-kitchen');
  if (closeBtn) closeBtn.addEventListener('click', closeKitchenDisplay);

  const refreshBtn = kitchenModalEl.querySelector('#btn-refresh-kitchen');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadKitchenData(false));

  const grid = kitchenModalEl.querySelector('#kitchen-kanban-grid');
  if (grid) {
    grid.addEventListener('click', async (e) => {
      // In phiếu bếp (CSS Print)
      const printBtn = e.target.closest('.btn-print-ticket');
      if (printBtn) {
        window.print();
        return;
      }

      // Đổi trạng thái món theo từng bước kế tiếp (T2.4 & T2.5) qua Event Delegation
      const btn = e.target.closest('.btn-change-status');
      if (btn && !btn.disabled) {
        const id = btn.getAttribute('data-id');
        const status = btn.getAttribute('data-status');
        const cardEl = btn.closest('.kitchen-item-card') || btn.closest('.card');
        btn.disabled = true;

        // Nút "Phục vụ ra bàn": mờ dần và biến mất sau 5 giây (T2.5)
        if (status === 'completed') {
          try {
            await api.patch(`/orders/items/${id}/status`, { status });
            showToast('Đã phục vụ món ra bàn!', 'success');
            btn.innerHTML = '✅ Đã phục vụ';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-success');

            if (cardEl) {
              cardEl.classList.add('kitchen-item-fading');
            }

            const targetItem = kitchenItems.find(it => String(it.id) === String(id));
            if (targetItem) {
              fadingItems.set(Number(id), { item: targetItem, startTime: Date.now() });
            }

            setTimeout(() => {
              fadingItems.delete(Number(id));
              if (cardEl && cardEl.parentNode) {
                cardEl.remove();
              }
              loadKitchenData(true);
            }, 5000);
          } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
          }
          return;
        }

        try {
          await api.patch(`/orders/items/${id}/status`, { status });
          showToast(`Đã chuyển trạng thái món sang: ${status}`, 'success');
          loadKitchenData(true);
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled = false;
        }
      }
    });
  }
}
