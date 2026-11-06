/**
 * TABLE MAP SECTION (Dành cho Khách hàng xem sơ đồ bàn & Đặt bàn từ xa)
 * Hiển thị mã bàn, số bàn, mã QR và cho phép khách đặt bàn từ xa theo thời gian thực.
 * Khách hàng không có quyền chỉnh sửa trạng thái bàn như nhân viên.
 */

import { api } from '../../services/api.js';
import { showToast } from '../../components/Toast.js';
import { escapeHtml } from '../../utils/format.js';
import { openReservationModal } from './ReservationModal.js';

let allTables = [];
let currentFilter = 'all';
let isSocketBound = false;

const STATUS_CONFIG = {
  empty: { label: 'Đang Trống', color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'rgba(34, 197, 94, 0.4)' },
  occupied: { label: 'Có Khách', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: 'rgba(239, 68, 68, 0.4)' },
  reserved: { label: 'Đã Đặt', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'rgba(234, 179, 8, 0.4)' },
  cleaning: { label: 'Đang Dọn', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' }
};

export async function initTableMapSection() {
  const container = document.querySelector('#table-map-section-container');
  if (!container) return;

  await loadTablesData();

  // Lắng nghe cập nhật realtime qua Socket.IO
  if (typeof window.io === 'function' && !isSocketBound) {
    try {
      const socket = window.io();
      socket.on('table:status', ({ tableId, status }) => {
        const table = allTables.find(t => String(t.id) === String(tableId));
        if (table) {
          table.status = status;
          renderTableMapSection();
        }
      });
      isSocketBound = true;
    } catch (err) {
      console.warn('Socket error in TableMapSection:', err);
    }
  }

  // Lắng nghe khi có đặt bàn mới thành công
  window.addEventListener('reservation:created', () => {
    loadTablesData();
  });
}

export async function loadTablesData() {
  try {
    const res = await api.get('/tables');
    allTables = res.data || [];
    renderTableMapSection();
  } catch (err) {
    console.warn('Lỗi tải danh sách bàn ăn:', err);
  }
}

export function renderTableMapSection() {
  const container = document.querySelector('#table-map-section-container');
  if (!container) return;

  const filteredTables = currentFilter === 'all'
    ? allTables
    : allTables.filter(t => t.area === currentFilter);

  const areas = [
    { id: 'all', label: `Tất cả (${allTables.length})` },
    { id: 'Tầng 1', label: 'Tầng 1' },
    { id: 'Tầng 2 (VIP)', label: 'Tầng 2 (VIP)' },
    { id: 'Sân vườn ngoài trời', label: 'Sân vườn' }
  ];

  container.innerHTML = `
    <!-- Thanh lọc khu vực & Chú thích trạng thái -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-6);">
      <!-- Filter pills -->
      <div class="flex gap-2 flex-wrap" role="tablist" aria-label="Lọc khu vực bàn">
        ${areas.map(a => `
          <button
            type="button"
            class="btn btn-sm ${currentFilter === a.id ? 'btn-primary' : 'btn-outline'}"
            data-area="${escapeHtml(a.id)}"
            style="border-radius: var(--radius-full); font-size: 0.85rem; padding: 6px 14px;"
            role="tab"
            aria-selected="${currentFilter === a.id ? 'true' : 'false'}"
          >
            ${escapeHtml(a.label)}
          </button>
        `).join('')}
      </div>

      <!-- Legend trạng thái -->
      <div class="flex gap-3 flex-wrap items-center" style="background: var(--color-surface); padding: 8px 16px; border-radius: var(--radius-full); border: 1px solid var(--color-border); font-size: 0.8rem;">
        <span style="font-weight: 700; color: var(--color-text-muted);">Trạng thái:</span>
        <span class="flex items-center gap-1"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); display: inline-block;"></span> Trống</span>
        <span class="flex items-center gap-1"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); display: inline-block;"></span> Đã đặt</span>
        <span class="flex items-center gap-1"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-danger); display: inline-block;"></span> Có khách</span>
        <span class="flex items-center gap-1"><span style="width: 8px; height: 8px; border-radius: 50%; background: #64748b; display: inline-block;"></span> Đang dọn</span>
      </div>
    </div>

    <!-- Lưới hiển thị các bàn -->
    <div class="table-map-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: var(--space-5);">
      ${filteredTables.length === 0 ? `
        <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-10); color: var(--color-text-muted);">
          Không có bàn nào trong khu vực này.
        </div>
      ` : filteredTables.map(t => {
        const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.empty;
        const isEmpty = t.status === 'empty';

        return `
          <div
            class="card"
            style="border: 2px solid ${cfg.border}; background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); position: relative;"
          >
            <div>
              <!-- Header thẻ bàn: Số bàn & Mã bàn -->
              <div class="flex justify-between items-start" style="margin-bottom: var(--space-3); border-bottom: 1px dashed var(--color-border); padding-bottom: var(--space-2);">
                <div>
                  <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--color-text); line-height: 1.2;">
                    ${escapeHtml(t.table_number)}
                  </h3>
                  <div style="margin-top: 4px;">
                    <span class="badge" style="background: rgba(214, 163, 74, 0.15); color: #B94A2B; font-weight: 700; font-size: 0.72rem; border: 1px solid rgba(214, 163, 74, 0.3);">
                      Mã: ${escapeHtml(t.qr_token || '')}
                    </span>
                  </div>
                </div>
                <span class="badge" style="background-color: ${cfg.bg}; color: ${cfg.color}; font-size: 0.75rem; font-weight: 700; border: 1px solid ${cfg.border};">
                  ${cfg.label}
                </span>
              </div>

              <!-- Body: Ảnh Mã QR gọi món & vị trí sức chứa -->
              <div style="text-align: center; margin-bottom: var(--space-3);">
                ${t.qr_image ? `
                  <div style="background: #FFFFFF; border-radius: var(--radius-md); padding: 8px; display: inline-block; border: 1px solid var(--color-border); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <img
                      src="${escapeHtml(t.qr_image)}"
                      alt="Mã QR ${escapeHtml(t.table_number)}"
                      width="120"
                      height="120"
                      style="display: block; border-radius: var(--radius-sm);"
                      loading="lazy"
                    />
                  </div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 6px; font-weight: 500;">
                    Mã QR gọi món trực tiếp tại bàn
                  </div>
                ` : ''}
              </div>

              <div style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.6; margin-bottom: var(--space-4); background: var(--color-surface-alt); padding: 10px 14px; border-radius: var(--radius-md);">
                <div>📍 Khu vực: <strong style="color: var(--color-text);">${escapeHtml(t.area)}</strong></div>
                <div>👥 Sức chứa: <strong style="color: var(--color-text);">${escapeHtml(t.capacity)} người</strong></div>
              </div>
            </div>

            <!-- Footer: Nút Đặt Bàn Từ Xa cho khách hàng -->
            <div>
              ${isEmpty ? `
                <button
                  type="button"
                  class="btn btn-primary btn-book-table-section"
                  data-id="${t.id}"
                  style="width: 100%; box-sizing: border-box; border-radius: var(--radius-full); font-weight: 700; font-size: 0.85rem; padding: 9px 14px; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; white-space: nowrap; box-shadow: 0 4px 12px rgba(185, 74, 43, 0.25);"
                >
                  🎯 Đặt Bàn Này Từ Xa
                </button>
              ` : `
                <button
                  type="button"
                  disabled
                  class="btn btn-outline"
                  style="width: 100%; box-sizing: border-box; border-radius: var(--radius-full); opacity: 0.65; cursor: not-allowed; font-size: 0.85rem; font-weight: 600; padding: 9px 14px; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; white-space: nowrap; background: rgba(0, 0, 0, 0.02);"
                >
                  🔒 Không khả dụng
                </button>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  attachSectionEvents(container);
}

function attachSectionEvents(container) {
  // Lọc theo khu vực
  container.querySelectorAll('button[data-area]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-area');
      renderTableMapSection();
    });
  });

  // Bấm Đặt Bàn Từ Xa
  container.querySelectorAll('.btn-book-table-section').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const table = allTables.find(t => String(t.id) === String(id));
      if (table) {
        showToast(`Đã chọn Bàn số ${table.table_number} (${table.area}) để đặt chỗ từ xa!`, 'info', 4000);
        openReservationModal(table);
      }
    });
  });
}
