/**
 * LOYALTY & ORDER HISTORY MODAL (Mục 12: Lịch sử đơn hàng & Điểm thành viên)
 * Áp dụng skills: frontend-developer, ui-ux-designer
 */

import { api } from '../../services/api.js';
import { cartService } from '../../services/cart.js';
import { formatCurrency, formatDate, escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { showToast } from '../../components/Toast.js';

let loyaltyModalEl = null;

export function openLoyaltyModal() {
  if (!loyaltyModalEl) {
    loyaltyModalEl = document.createElement('div');
    loyaltyModalEl.className = 'modal-backdrop';
    document.body.appendChild(loyaltyModalEl);

    loyaltyModalEl.addEventListener('click', (e) => {
      if (e.target === loyaltyModalEl) closeLoyaltyModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && loyaltyModalEl.classList.contains('active')) {
        closeLoyaltyModal();
      }
    });
  }

  loadLoyaltyAndHistory();
  if (!loyaltyModalEl.classList.contains('active')) {
    loyaltyModalEl.classList.add('active');
    lockScroll();
  }
}

export function closeLoyaltyModal() {
  if (loyaltyModalEl && loyaltyModalEl.classList.contains('active')) {
    loyaltyModalEl.classList.remove('active');
    unlockScroll();
  }
}

async function loadLoyaltyAndHistory() {
  try {
    const [resLoyalty, resOrders] = await Promise.all([
      api.get('/loyalty/me'),
      api.get('/orders/my-orders')
    ]);

    renderLoyaltyUI(resLoyalty.data, resOrders.data || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderLoyaltyUI(loyalty, orders) {
  loyaltyModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 680px; max-height: 90vh; max-height: 90dvh;">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.4rem;">👑</span>
          <h3 style="font-size: 1.25rem;">Thành Viên & Lịch Sử Gọi Món</h3>
        </div>
        <button id="btn-close-loyalty" class="btn-icon" title="Đóng">&times;</button>
      </div>

      <div class="modal-body" style="padding: var(--space-6);">
        <!-- Thẻ Thành viên VIP sang trọng -->
        <div 
          style="
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: #ffffff; padding: var(--space-5); border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl); border: 1px solid rgba(217, 119, 6, 0.3);
            margin-bottom: var(--space-6); position: relative; overflow: hidden;
          "
        >
          <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-primary);">Hạng Thành Viên</span>
              <h2 style="font-size: 1.6rem; color: #fbbf24; margin-top: 2px;">⭐ Hạng ${escapeHtml(loyalty.tier)}</h2>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.8rem; color: #94a3b8;">Điểm tích lũy</span>
              <div style="font-size: 1.8rem; font-weight: 800; color: #ffffff;">${loyalty.points} <span style="font-size: 1rem; color: #f59e0b;">điểm</span></div>
            </div>
          </div>

          <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: var(--space-4);">
            Ưu đãi hạng hiện tại: Giảm ${loyalty.discountRate}% khi đặt bàn và ưu tiên phục vụ.
          </p>

          <!-- Nút đổi điểm lấy voucher -->
          <div class="flex gap-2" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: var(--space-3);">
            <button class="btn btn-sm btn-outline btn-redeem" data-val="20000" style="color: #fbbf24; border-color: #fbbf24; font-size: 0.8rem;">
              🎁 Đổi 200 điểm = Voucher 20k
            </button>
            <button class="btn btn-sm btn-outline btn-redeem" data-val="50000" style="color: #fbbf24; border-color: #fbbf24; font-size: 0.8rem;">
              💎 Đổi 500 điểm = Voucher 50k
            </button>
          </div>
        </div>

        <!-- Lịch sử các đơn hàng trước đây -->
        <h4 style="font-size: 1.1rem; margin-bottom: var(--space-3);">Lịch Sử Đơn Hàng Của Bạn (${orders.length})</h4>
        
        <div class="flex flex-col gap-3">
          ${orders.length === 0 ? `
            <div style="text-align: center; color: var(--color-text-muted); padding: var(--space-6);">
              Bạn chưa có đơn hàng nào trước đây. Hãy đặt món ngay nhé!
            </div>
          ` : orders.map(ord => `
            <div class="card" style="padding: var(--space-3) var(--space-4);">
              <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
                <div>
                  <span style="font-weight: 800; color: var(--color-primary);">${escapeHtml(ord.order_code)}</span>
                  <span style="font-size: 0.8rem; color: var(--color-text-muted); margin-left: 8px;">${formatDate(ord.created_at)}</span>
                </div>
                <span class="badge ${ord.status === 'completed' ? 'badge-success' : (ord.status === 'cancelled' ? 'badge-danger' : 'badge-amber')}">
                  ${escapeHtml(ord.status)}
                </span>
              </div>

              <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: var(--space-2);">
                ${(ord.items || []).map(i => `${i.quantity}x ${escapeHtml(i.dish_name)}`).join(', ')}
              </div>

              <div class="flex justify-between items-center" style="border-top: 1px solid var(--color-border); padding-top: var(--space-2);">
                <span style="font-weight: 700; color: var(--color-text-main); font-size: 0.95rem;">
                  Tổng tiền: ${formatCurrency(ord.total_amount)}
                </span>
                <div class="flex gap-2">
                  <a href="/hoa-don.html?code=${encodeURIComponent(ord.order_code)}" target="_blank" class="btn btn-sm btn-secondary" style="text-decoration: none;">
                    🧾 Hóa đơn
                  </a>
                  <button class="btn btn-sm btn-outline btn-reorder" data-id="${ord.id}">
                    🔄 Đặt lại món này
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  attachLoyaltyEvents(orders);
}

function attachLoyaltyEvents(orders) {
  const closeBtn = loyaltyModalEl.querySelector('#btn-close-loyalty');
  if (closeBtn) closeBtn.addEventListener('click', closeLoyaltyModal);

  // Đổi điểm lấy voucher
  loyaltyModalEl.querySelectorAll('.btn-redeem').forEach(btn => {
    btn.addEventListener('click', async () => {
      const val = parseInt(btn.getAttribute('data-val'), 10);
      try {
        const res = await api.post('/loyalty/redeem', { voucher_value: val });
        showToast(res.message, 'success', 5000);
        loadLoyaltyAndHistory();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Đặt lại đơn cũ
  loyaltyModalEl.querySelectorAll('.btn-reorder').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const order = orders.find(o => o.id === id);
      if (order && order.items) {
        order.items.forEach(it => {
          cartService.addItem({
            dish_id: it.dish_id,
            dish_name: it.dish_name,
            dish_price: it.dish_price,
            quantity: it.quantity,
            spice_level: it.spice_level,
            selected_toppings: it.selected_toppings || [],
            note: it.note
          });
        });
        showToast(`Đã thêm lại các món của đơn ${order.order_code} vào giỏ hàng!`, 'success');
        closeLoyaltyModal();
      }
    });
  });
}
