/**
 * DISH DETAIL MODAL (Mục 4: Chi tiết món, độ cay, topping, ghi chú và giá cập nhật realtime)
 * Áp dụng skills: ui-ux-designer, frontend-developer
 */

import { formatCurrency, escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { cartService } from '../../services/cart.js';
import { showToast } from '../../components/Toast.js';

let modalElement = null;
let currentDish = null;
let currentQuantity = 1;
let selectedSpiceLevel = 0;
let selectedToppings = [];

const SPICE_LABELS = [
  { level: 0, label: 'Không cay', icon: '🍃' },
  { level: 1, label: 'Cay nhẹ', icon: '🌶️' },
  { level: 2, label: 'Cay vừa', icon: '🌶️🌶️' },
  { level: 3, label: 'Cay nhiều', icon: '🌶️🌶️🌶️' },
  { level: 4, label: 'Siêu cay', icon: '🔥🌶️🔥' }
];

export function openDishDetailModal(dishData) {
  currentDish = dishData;
  currentQuantity = 1;
  selectedSpiceLevel = 0;
  selectedToppings = [];

  if (!modalElement) {
    modalElement = document.createElement('div');
    modalElement.className = 'modal-backdrop';
    document.body.appendChild(modalElement);

    // Bấm ra ngoài nền để đóng
    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement) {
        closeDishDetailModal();
      }
    });

    // Bấm ESC để đóng modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalElement.classList.contains('active')) {
        closeDishDetailModal();
      }
    });
  }

  renderModalContent();
  if (!modalElement.classList.contains('active')) {
    modalElement.classList.add('active');
    lockScroll();
  }
}

export function closeDishDetailModal() {
  if (modalElement && modalElement.classList.contains('active')) {
    modalElement.classList.remove('active');
    unlockScroll();
  }
}

function calculateTotalPrice() {
  if (!currentDish) return 0;
  const toppingTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const singleItemPrice = currentDish.price + toppingTotal;
  return singleItemPrice * currentQuantity;
}

function updatePriceDisplay() {
  const priceDisplay = modalElement.querySelector('#modal-total-price');
  if (priceDisplay) {
    priceDisplay.textContent = formatCurrency(calculateTotalPrice());
  }
}

function renderModalContent() {
  const maxSpice = currentDish.spice_levels_allowed !== undefined ? currentDish.spice_levels_allowed : 4;
  const availableSpices = SPICE_LABELS.filter(s => s.level <= maxSpice);
  const toppings = currentDish.toppings || [];

  modalElement.innerHTML = `
    <div class="modal-box modal-dish-detail" style="max-width: 600px;">
      <!-- Header modal với ảnh món ăn -->
      <div style="position: relative;">
        <img 
          src="${escapeHtml(currentDish.image || '/public/images/menu/placeholder.svg')}" 
          alt="${escapeHtml(currentDish.name)}"
          style="width: 100%; max-height: 260px; height: auto; aspect-ratio: 16/9; object-fit: cover;"
        />
        <button 
          id="btn-close-modal" 
          class="btn-icon" 
          style="position: absolute; top: 16px; right: 16px; background-color: rgba(255, 255, 255, 0.9); box-shadow: var(--shadow-md);"
          title="Đóng"
        >
          &times;
        </button>

        ${currentDish.is_featured ? '<span class="badge badge-banchay" style="position: absolute; bottom: 16px; left: 16px;">🔥 Bán chạy nhất</span>' : ''}
      </div>

      <div class="modal-body">
        <div style="margin-bottom: var(--space-4);">
          <div class="flex items-center justify-between" style="gap: var(--space-2);">
            <h2 style="font-size: 1.4rem;">${escapeHtml(currentDish.name)}</h2>
            <span style="font-size: 1.3rem; font-weight: 800; color: var(--color-primary);">
              ${formatCurrency(currentDish.price)}
            </span>
          </div>
          <p style="margin-top: var(--space-2); font-size: 0.95rem; line-height: 1.5;">
            ${escapeHtml(currentDish.description || 'Hương vị thơm ngon độc quyền chuẩn phong cách nhà hàng.')}
          </p>
          <div class="flex items-center gap-4" style="margin-top: var(--space-2); font-size: 0.85rem; color: var(--color-text-muted);">
            <span>⏱️ Chuẩn bị: ~${currentDish.prep_minutes || 15} phút</span>
            <span>⭐ Đánh giá: ${currentDish.rating_avg || 5.0} / 5</span>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--color-border); margin: var(--space-4) 0;" />

        <!-- 1. Chọn cấp độ cay (0 - 4 cấp) -->
        ${availableSpices.length > 1 ? `
          <div style="margin-bottom: var(--space-5);">
            <label class="form-label" style="margin-bottom: var(--space-2); display: block;">
              🌶️ Chọn cấp độ cay:
            </label>
            <div class="flex flex-wrap gap-2" id="spice-selector">
              ${availableSpices.map(spice => `
                <button 
                  type="button" 
                  class="btn btn-sm ${spice.level === selectedSpiceLevel ? 'btn-primary' : 'btn-secondary'}"
                  data-spice="${spice.level}"
                  style="border-radius: var(--radius-full);"
                >
                  ${spice.icon} ${spice.label}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 2. Chọn Topping cộng thêm tiền -->
        ${toppings.length > 0 ? `
          <div style="margin-bottom: var(--space-5);">
            <label class="form-label" style="margin-bottom: var(--space-2); display: block;">
              ✨ Topping & Món kèm thêm:
            </label>
            <div class="flex flex-col gap-2" id="topping-selector">
              ${toppings.map(t => `
                <label 
                  class="flex items-center justify-between card" 
                  style="padding: 0.65rem 1rem; cursor: pointer; transition: background-color var(--transition-fast);"
                >
                  <div class="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      class="topping-checkbox" 
                      data-id="${t.id}" 
                      data-name="${escapeHtml(t.name)}" 
                      data-price="${t.price}"
                      style="width: 18px; height: 18px; accent-color: var(--color-primary); cursor: pointer;"
                    />
                    <span style="font-weight: 500; font-size: 0.95rem;">${escapeHtml(t.name)}</span>
                  </div>
                  <span style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem;">
                    +${formatCurrency(t.price)}
                  </span>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 3. Ô ghi chú cho bếp -->
        <div style="margin-bottom: var(--space-4);">
          <label class="form-label" for="dish-note">📝 Ghi chú cho đầu bếp:</label>
          <input 
            type="text" 
            id="dish-note" 
            class="input" 
            placeholder="Ví dụ: Không bỏ hành, ít ngọt, làm chín kỹ..."
            style="font-size: 0.9rem;"
          />
        </div>
      </div>

      <!-- Footer Modal: Tăng giảm số lượng và Nút thêm vào giỏ -->
      <div class="modal-footer" style="justify-content: space-between; flex-wrap: wrap; gap: var(--space-2);">
        <div class="flex items-center gap-2">
          <button id="btn-qty-minus" class="btn btn-secondary btn-icon" style="width: 36px; height: 36px;">−</button>
          <span id="modal-qty-text" style="font-weight: 700; font-size: 1.1rem; min-width: 28px; text-align: center;">1</span>
          <button id="btn-qty-plus" class="btn btn-secondary btn-icon" style="width: 36px; height: 36px;">+</button>
        </div>

        <button id="btn-add-to-cart" class="btn btn-primary btn-lg" style="flex: 1 1 180px; min-width: 140px; margin-left: 0;">
          🛒 Thêm vào giỏ • <span id="modal-total-price">${formatCurrency(calculateTotalPrice())}</span>
        </button>
      </div>
    </div>
  `;

  attachModalEvents();
}

function attachModalEvents() {
  const closeBtn = modalElement.querySelector('#btn-close-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeDishDetailModal);

  // Chọn độ cay
  const spiceBtns = modalElement.querySelectorAll('#spice-selector button');
  spiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      spiceBtns.forEach(b => {
        b.className = 'btn btn-sm btn-secondary';
        b.style.borderRadius = 'var(--radius-full)';
      });
      btn.className = 'btn btn-sm btn-primary';
      btn.style.borderRadius = 'var(--radius-full)';
      selectedSpiceLevel = parseInt(btn.getAttribute('data-spice'));
    });
  });

  // Chọn Topping (tính giá realtime)
  const toppingCheckboxes = modalElement.querySelectorAll('.topping-checkbox');
  toppingCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      selectedToppings = [];
      toppingCheckboxes.forEach(box => {
        if (box.checked) {
          selectedToppings.push({
            id: parseInt(box.getAttribute('data-id')),
            name: box.getAttribute('data-name'),
            price: parseFloat(box.getAttribute('data-price')) || 0
          });
        }
      });
      updatePriceDisplay();
    });
  });

  // Tăng giảm số lượng
  const minusBtn = modalElement.querySelector('#btn-qty-minus');
  const plusBtn = modalElement.querySelector('#btn-qty-plus');
  const qtyText = modalElement.querySelector('#modal-qty-text');

  if (minusBtn && plusBtn && qtyText) {
    minusBtn.addEventListener('click', () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        qtyText.textContent = currentQuantity;
        updatePriceDisplay();
      }
    });

    plusBtn.addEventListener('click', () => {
      currentQuantity++;
      qtyText.textContent = currentQuantity;
      updatePriceDisplay();
    });
  }

  // Bấm Thêm vào giỏ
  const addBtn = modalElement.querySelector('#btn-add-to-cart');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const noteInput = modalElement.querySelector('#dish-note');
      const note = noteInput ? noteInput.value.trim() : '';

      cartService.addItem({
        dish_id: currentDish.id,
        dish_name: currentDish.name,
        dish_price: currentDish.price,
        dish_image: currentDish.image,
        vat_category: currentDish.vat_category || (currentDish.category_id === 3 ? 'alcohol' : 'food'),
        quantity: currentQuantity,
        spice_level: selectedSpiceLevel,
        selected_toppings: selectedToppings,
        note
      });

      showToast(`Đã thêm ${currentQuantity}x "${currentDish.name}" vào giỏ hàng!`, 'success');
      closeDishDetailModal();
    });
  }
}
