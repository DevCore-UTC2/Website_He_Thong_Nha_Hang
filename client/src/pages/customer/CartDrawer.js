/**
 * CART DRAWER COMPONENT (Mục 5: Giỏ hàng trực quan)
 * Áp dụng skills: frontend-developer, ui-ux-designer
 */

import { cartService } from '../../services/cart.js';
import { formatCurrency, escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { showToast } from '../../components/Toast.js';
import { isOrderingAllowed, getOrderingMessage, fetchStoreStatus } from '../../services/storeService.js';

let drawerBackdrop = null;

export function initCartDrawer() {
  if (drawerBackdrop) return;

  drawerBackdrop = document.createElement('div');
  drawerBackdrop.className = 'drawer-backdrop';
  drawerBackdrop.innerHTML = `
    <div class="cart-drawer" role="dialog" aria-modal="true" aria-label="Giỏ Hàng Của Bạn">
      <div class="drawer-header">
        <div class="flex items-center gap-2">
          <h2 style="font-size: 1.2rem; font-weight: 700; margin: 0;">Giỏ Hàng Của Bạn</h2>
          <span id="cart-drawer-count" class="badge badge-amber">0 món</span>
        </div>
        <button id="btn-close-cart" class="btn-icon" title="Đóng giỏ hàng" aria-label="Đóng giỏ hàng">&times;</button>
      </div>

      <div class="drawer-body" id="cart-drawer-body">
        <!-- Render danh sách món giỏ hàng -->
      </div>

      <div class="drawer-footer" id="cart-drawer-footer">
        <!-- Render tổng tiền và nút thanh toán -->
      </div>
    </div>
  `;

  document.body.appendChild(drawerBackdrop);

  // Sự kiện đóng drawer
  drawerBackdrop.addEventListener('click', (e) => {
    if (e.target === drawerBackdrop) closeCartDrawer();
  });

  const closeBtn = drawerBackdrop.querySelector('#btn-close-cart');
  if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);

  // Lắng nghe sự kiện giỏ hàng thay đổi
  window.addEventListener('cart:change', () => {
    if (drawerBackdrop.classList.contains('active')) {
      renderCartDrawer();
    }
    updateCartHeaderBadge();
  });

  // Lắng nghe sự kiện trạng thái nhà hàng thay đổi (realtime hoặc từ admin)
  window.addEventListener('store:status_updated', () => {
    if (drawerBackdrop && drawerBackdrop.classList.contains('active')) {
      renderCartDrawer();
    }
  });

  updateCartHeaderBadge();
}

export function openCartDrawer() {
  initCartDrawer();
  renderCartDrawer();
  if (!drawerBackdrop.classList.contains('active')) {
    drawerBackdrop.classList.add('active');
    lockScroll();
  }

  // Tải trạng thái mới nhất từ server và đồng bộ giao diện giỏ hàng
  fetchStoreStatus().then(() => {
    if (drawerBackdrop && drawerBackdrop.classList.contains('active')) {
      renderCartDrawer();
    }
  });
}

export function closeCartDrawer() {
  if (drawerBackdrop && drawerBackdrop.classList.contains('active')) {
    drawerBackdrop.classList.remove('active');
    unlockScroll();
  }
}

function updateCartHeaderBadge() {
  const count = cartService.getItemCount();
  const badge = document.querySelector('#header-cart-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

function renderCartDrawer() {
  const items = cartService.getItems();
  const count = cartService.getItemCount();
  const subtotal = cartService.getSubtotal();

  const countBadge = drawerBackdrop.querySelector('#cart-drawer-count');
  if (countBadge) countBadge.textContent = `${count} món`;

  const bodyEl = drawerBackdrop.querySelector('#cart-drawer-body');
  const footerEl = drawerBackdrop.querySelector('#cart-drawer-footer');

  if (items.length === 0) {
    bodyEl.innerHTML = `
      <div class="empty-state" style="margin: auto 0;">
        <div class="empty-icon">🍽️</div>
        <div class="empty-title">Giỏ hàng đang trống</div>
        <div class="empty-desc">Bạn chưa chọn món ăn nào. Hãy dạo quanh thực đơn và chọn món ngon nhé!</div>
        <button id="btn-browse-menu" class="btn btn-primary" style="margin-top: var(--space-4);">
          Xem thực đơn ngay
        </button>
      </div>
    `;

    footerEl.innerHTML = '';

    const browseBtn = bodyEl.querySelector('#btn-browse-menu');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => {
        closeCartDrawer();
        const menuSection = document.querySelector('#menu-section');
        if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
      });
    }
    return;
  }

  // Render danh sách món
  bodyEl.innerHTML = items.map(item => {
    const toppingTotal = (item.selected_toppings || []).reduce((sum, t) => sum + (t.price || 0), 0);
    const itemUnitPrice = (item.dish_price || 0) + toppingTotal;
    const itemTotal = itemUnitPrice * item.quantity;

    return `
      <div class="card flex gap-3 cart-item-card" style="padding: var(--space-3); border-color: var(--color-border); position: relative; height: auto; min-height: fit-content; overflow: visible; align-items: flex-start;">
        <img 
          src="${escapeHtml(item.dish_image || '/public/images/menu/placeholder.svg')}" 
          alt="${escapeHtml(item.dish_name)}"
          style="width: 76px; height: 76px; min-width: 76px; object-fit: cover; border-radius: var(--radius-md); flex-shrink: 0;"
        />
        <div class="flex-1" style="min-width: 0; display: flex; flex-direction: column; gap: var(--space-2);">
          <div>
            <div class="flex items-start justify-between gap-2">
              <h4 style="font-size: 0.95rem; font-weight: 700; line-height: 1.35; margin: 0; word-break: break-word;">
                ${escapeHtml(item.dish_name)}
              </h4>
              <button class="btn-remove-item" data-id="${item.id}" style="color: var(--color-text-muted); font-size: 1.1rem; line-height: 1; border: none; background: transparent; cursor: pointer; padding: 2px 4px; flex-shrink: 0;" title="Xóa món">&times;</button>
            </div>

            <!-- Tùy chọn độ cay & Topping -->
            <div style="font-size: 0.775rem; color: var(--color-text-muted); margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
              ${item.spice_level > 0 ? `<span>🌶️ Độ cay: Cấp ${item.spice_level}</span>` : '<span>🍃 Không cay</span>'}
              ${item.selected_toppings && item.selected_toppings.length > 0 ? `
                <div style="color: var(--color-primary); font-weight: 500;">
                  + ${item.selected_toppings.map(t => escapeHtml(typeof t === 'string' ? t : (t.name || t.topping_name || ''))).filter(Boolean).join(', ')}
                </div>
              ` : ''}
              ${item.note ? `<div style="font-style: italic; color: var(--color-text-main);">📝 "${escapeHtml(item.note)}"</div>` : ''}
            </div>
          </div>

          <div class="flex items-center justify-between" style="margin-top: 4px; padding-top: 6px; border-top: 1px dashed var(--color-border);">
            <span style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
              ${formatCurrency(itemTotal)}
            </span>

            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-icon btn-cart-minus" data-id="${item.id}" style="width: 28px; height: 28px; min-width: 28px; min-height: 28px; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; padding: 0;">−</button>
              <span style="font-weight: 700; font-size: 0.95rem; min-width: 24px; text-align: center;">${item.quantity}</span>
              <button class="btn btn-secondary btn-icon btn-cart-plus" data-id="${item.id}" style="width: 28px; height: 28px; min-width: 28px; min-height: 28px; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; padding: 0;">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Footer tính tiền: Giá niêm yết đã bao gồm VAT (PRICE_INCLUDES_VAT = true)
  let totalBeforeVat = 0;
  let vat8Amount = 0;
  let vat10Amount = 0;

  items.forEach(it => {
    const toppingTotal = (it.selected_toppings || []).reduce((sum, t) => sum + (t.price || 0), 0);
    const itemTotal = ((it.dish_price || 0) + toppingTotal) * it.quantity;
    const rate = it.vat_category === 'alcohol' ? 0.10 : 0.08;
    const beforeVat = Math.round(itemTotal / (1 + rate));
    const vatVal = itemTotal - beforeVat;

    totalBeforeVat += beforeVat;
    if (rate === 0.08) {
      vat8Amount += vatVal;
    } else {
      vat10Amount += vatVal;
    }
  });

  const grandTotal = subtotal;

  footerEl.innerHTML = `
    <div class="flex flex-col gap-2" style="margin-bottom: var(--space-4); font-size: 0.9rem;">
      <div class="flex justify-between" style="color: var(--color-text-muted);">
        <span>Tạm tính (Đã gồm VAT):</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${formatCurrency(subtotal)}</span>
      </div>
      <div class="flex justify-between" style="color: var(--color-text-muted); font-size: 0.825rem;">
        <span>↳ Trong đó chưa thuế:</span>
        <span>${formatCurrency(totalBeforeVat)}</span>
      </div>
      ${vat8Amount > 0 ? `
        <div class="flex justify-between" style="color: var(--color-text-muted); font-size: 0.825rem;">
          <span>↳ Thuế VAT 8% (thức ăn, nước ngọt):</span>
          <span>${formatCurrency(vat8Amount)}</span>
        </div>
      ` : ''}
      ${vat10Amount > 0 ? `
        <div class="flex justify-between" style="color: var(--color-text-muted); font-size: 0.825rem;">
          <span>↳ Thuế VAT 10% (rượu, bia):</span>
          <span>${formatCurrency(vat10Amount)}</span>
        </div>
      ` : ''}
      <div class="flex justify-between" style="font-size: 1.15rem; font-weight: 800; border-top: 1px dashed var(--color-border); padding-top: var(--space-2); margin-top: 2px;">
        <span>Tổng thanh toán:</span>
        <span style="color: var(--color-primary);">${formatCurrency(grandTotal)}</span>
      </div>
    </div>

    ${!isOrderingAllowed() ? `
      <div style="background: rgba(181, 71, 42, 0.1); border: 1px solid var(--color-primary); color: var(--color-primary); padding: 8px 12px; border-radius: var(--radius-md); font-size: 0.82rem; margin-bottom: 8px; text-align: center; font-weight: 600;">
        ${escapeHtml(getOrderingMessage() || 'Nhà hàng hiện đã đóng cửa nhận đơn!')}
      </div>
    ` : ''}

    <div class="flex gap-2" style="width: 100%; min-width: 0;">
      <button id="btn-clear-cart" class="btn btn-secondary" style="padding: 0.75rem; flex-shrink: 0;" title="Làm trống giỏ">🗑️</button>
      <button id="btn-checkout" class="btn btn-primary btn-lg flex-1" style="min-width: 0; padding: 0.75rem 0.5rem; white-space: normal; line-height: 1.25; text-align: center;">
        Tiến hành đặt món • ${formatCurrency(grandTotal)}
      </button>
    </div>
  `;

  // Gắn sự kiện các nút trong giỏ
  bodyEl.querySelectorAll('.btn-cart-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseFloat(btn.getAttribute('data-id'));
      cartService.updateQuantity(id, -1);
    });
  });

  bodyEl.querySelectorAll('.btn-cart-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseFloat(btn.getAttribute('data-id'));
      cartService.updateQuantity(id, 1);
    });
  });

  bodyEl.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseFloat(btn.getAttribute('data-id'));
      cartService.removeItem(id);
      showToast('Đã xóa món khỏi giỏ hàng.', 'info');
    });
  });

  const clearBtn = footerEl.querySelector('#btn-clear-cart');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn làm trống toàn bộ giỏ hàng?')) {
        cartService.clearCart();
        showToast('Đã xóa toàn bộ giỏ hàng.', 'info');
      }
    });
  }

  const checkoutBtn = footerEl.querySelector('#btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!isOrderingAllowed()) {
        showToast(getOrderingMessage() || 'Nhà hàng hiện đã đóng cửa nhận đơn!', 'warning');
        return;
      }
      import('./CheckoutModal.js').then(module => {
        module.openCheckoutModal();
      });
    });
  }
}
