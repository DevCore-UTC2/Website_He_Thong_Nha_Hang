/**
 * TABLE MAP & QR GENERATOR (Mục 10: Sơ đồ bàn & QR tại bàn)
 * Hỗ trợ 2 chế độ:
 * - Nhân viên / Admin: Đổi trạng thái bàn, in mã QR, quét thử nghiệm.
 * - Khách hàng: Xem số bàn, mã bàn, quét QR và Đặt bàn từ xa trực tiếp.
 */

import { api } from '../../services/api.js';
import { authService } from '../../services/auth.js';
import { showToast } from '../../components/Toast.js';
import { escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { openReservationModal } from '../customer/ReservationModal.js';

let tableModalEl = null;
let tables = [];
let isSocketBound = false;

const STATUS_CONFIG = {
  empty: { label: 'Trống', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  occupied: { label: 'Có khách', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  reserved: { label: 'Đã đặt', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  cleaning: { label: 'Cần dọn', color: '#64748b', bg: '#f1f5f9' }
};

export function openTableMapModal() {
  if (!tableModalEl) {
    tableModalEl = document.createElement('div');
    tableModalEl.className = 'modal-backdrop';
    document.body.appendChild(tableModalEl);

    tableModalEl.addEventListener('click', (e) => {
      if (e.target === tableModalEl) closeTableMapModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && tableModalEl.classList.contains('active')) {
        closeTableMapModal();
      }
    });

    // Lắng nghe Socket.IO realtime
    if (typeof window.io === 'function' && !isSocketBound) {
      try {
        const socket = window.io();
        socket.on('table:status', ({ tableId, status }) => {
          const table = tables.find(t => String(t.id) === String(tableId));
          if (table) {
            table.status = status;
            if (tableModalEl && tableModalEl.classList.contains('active')) {
              renderTableMapUI();
            }
          }
        });
        isSocketBound = true;
      } catch (err) {
        console.warn('Socket error in TableMapModal:', err);
      }
    }
  }

  if (!tableModalEl.classList.contains('active')) {
    tableModalEl.classList.add('active');
    lockScroll();
  }
  loadTablesData();
}

export function closeTableMapModal() {
  if (tableModalEl && tableModalEl.classList.contains('active')) {
    tableModalEl.classList.remove('active');
    unlockScroll();
  }
}

async function loadTablesData() {
  try {
    const res = await api.get('/tables');
    tables = res.data || [];
    renderTableMapUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderTableMapUI() {
  const user = authService.getCurrentUser();
  const isStaffOrAdmin = user && (user.role === 'admin' || user.role === 'staff');

  tableModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 920px; max-height: 92vh; max-height: 92dvh;">
      <div class="modal-header">
        <div class="flex items-center gap-3">
          <span style="font-size: 1.4rem;">🗺️</span>
          <div>
            <h3 style="font-size: 1.25rem;">Sơ Đồ Bàn Ăn &amp; Mã QR Gọi Món</h3>
            <p style="font-size: 0.85rem; margin: 0; color: var(--color-text-muted);">
              ${isStaffOrAdmin ? 'Theo dõi tình trạng bàn, in mã QR và điều phối trạng thái bàn ăn' : 'Theo dõi tình trạng chỗ ngồi theo thời gian thực và đặt bàn từ xa'}
            </p>
          </div>
        </div>
        <button id="btn-close-table-map" class="btn-icon" title="Đóng">&times;</button>
      </div>

      <div class="modal-body" style="padding: var(--space-6);">
        <!-- Chú thích màu sắc trạng thái -->
        <div class="flex gap-4 flex-wrap" style="margin-bottom: var(--space-6); padding: var(--space-3); background-color: var(--color-surface-alt); border-radius: var(--radius-md);">
          ${Object.entries(STATUS_CONFIG).map(([key, cfg]) => `
            <div class="flex items-center gap-2" style="font-size: 0.85rem;">
              <span style="width: 12px; height: 12px; border-radius: var(--radius-full); background-color: ${cfg.color}; display: inline-block;"></span>
              <span style="font-weight: 600;">${cfg.label}</span>
            </div>
          `).join('')}
        </div>

        <!-- Lưới sơ đồ bàn -->
        <div class="table-map-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr)); gap: var(--space-4);">
          ${tables.map(t => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.empty;
            const isEmpty = t.status === 'empty';

            return `
              <div class="card" style="padding: var(--space-4); border: 2px solid ${cfg.color}; position: relative; background: var(--color-surface); border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
                    <div>
                      <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0;">${escapeHtml(t.table_number)}</h4>
                      <span class="badge" style="background: rgba(214, 163, 74, 0.15); color: #B94A2B; font-weight: 700; font-size: 0.7rem; margin-top: 3px; display: inline-block;">
                        Mã: ${escapeHtml(t.qr_token || '')}
                      </span>
                    </div>
                    <span class="badge" style="background-color: ${cfg.bg}; color: ${cfg.color}; font-size: 0.75rem; font-weight: 700;">
                      ${cfg.label}
                    </span>
                  </div>

                  <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: var(--space-3); line-height: 1.5;">
                    <div>📍 Khu vực: <strong>${escapeHtml(t.area)}</strong></div>
                    <div>👥 Sức chứa: <strong>${escapeHtml(t.capacity)} người</strong></div>
                  </div>

                  <!-- Xem trước ảnh mã QR của bàn -->
                  <div style="text-align: center; margin-bottom: var(--space-3);">
                    ${t.qr_image ? `
                      <img src="${escapeHtml(t.qr_image)}" alt="Mã QR ${escapeHtml(t.table_number)}" width="110" height="110" style="margin: 0 auto; border-radius: var(--radius-sm); border: 1px solid var(--color-border); display: block;" loading="lazy" />
                      <div style="font-size: 0.7rem; color: var(--color-text-muted); margin-top: 4px;">Mã QR gọi món trực tiếp</div>
                    ` : ''}
                  </div>
                </div>

                <!-- Thao tác phân theo vai trò -->
                <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-2); margin-top: auto;">
                  ${isStaffOrAdmin ? `
                    <div class="flex items-center gap-1 justify-between">
                      <select class="select select-table-status" data-id="${t.id}" style="padding: 4px 8px; font-size: 0.8rem; width: auto; flex: 1;">
                        <option value="empty" ${t.status === 'empty' ? 'selected' : ''}>Trống</option>
                        <option value="occupied" ${t.status === 'occupied' ? 'selected' : ''}>Có khách</option>
                        <option value="reserved" ${t.status === 'reserved' ? 'selected' : ''}>Đã đặt</option>
                        <option value="cleaning" ${t.status === 'cleaning' ? 'selected' : ''}>Cần dọn</option>
                      </select>

                      <button class="btn btn-sm btn-outline btn-test-qr" data-token="${escapeHtml(t.qr_token)}" title="Thử nghiệm quét QR bàn này" style="font-size: 0.75rem;">
                        📲 Quét thử
                      </button>
                    </div>
                  ` : `
                    ${isEmpty ? `
                      <button class="btn btn-sm btn-primary btn-modal-book-remote" data-id="${t.id}" style="width: 100%; box-sizing: border-box; border-radius: var(--radius-full); font-weight: 700; padding: 7px 12px; min-height: 38px; display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; white-space: nowrap;">
                        🎯 Đặt Bàn Này Từ Xa
                      </button>
                    ` : `
                      <div style="width: 100%; box-sizing: border-box; text-align: center; font-size: 0.8rem; font-weight: 600; color: ${cfg.color}; background: ${cfg.bg}; padding: 7px 12px; border-radius: var(--radius-full); min-height: 38px; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap;">
                        🔒 Không khả dụng
                      </div>
                    `}
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  attachTableMapEvents();
}

function attachTableMapEvents() {
  const closeBtn = tableModalEl.querySelector('#btn-close-table-map');
  if (closeBtn) closeBtn.addEventListener('click', closeTableMapModal);

  // Đổi trạng thái bàn (dành cho Nhân viên / Quản trị)
  tableModalEl.querySelectorAll('.select-table-status').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.getAttribute('data-id');
      const status = e.target.value;
      try {
        await api.patch(`/tables/${id}/status`, { status });
        showToast('Đã cập nhật trạng thái bàn ăn!', 'success');
        loadTablesData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Nút Quét thử mã QR (Mở URL gắn sẵn mã bàn)
  tableModalEl.querySelectorAll('.btn-test-qr').forEach(btn => {
    btn.addEventListener('click', () => {
      const token = btn.getAttribute('data-token');
      window.location.search = `?table=${token}`;
    });
  });

  // Nút Đặt Bàn Từ Xa (dành cho Khách hàng)
  tableModalEl.querySelectorAll('.btn-modal-book-remote').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const table = tables.find(t => String(t.id) === String(id));
      if (table) {
        closeTableMapModal();
        showToast(`Đã chọn Bàn số ${table.table_number} (${table.area}) để đặt chỗ từ xa!`, 'info', 4000);
        openReservationModal(table);
      }
    });
  });
}
