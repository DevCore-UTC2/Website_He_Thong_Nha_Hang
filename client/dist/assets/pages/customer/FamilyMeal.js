/**
 * FAMILY MEAL VIEW — VỊ NHÀ MÌNH (T28)
 * Ẩm thực mâm cơm gia đình miền Tây & Nam Bộ
 * 
 * Bố cục tròn 4 món chuẩn vị: Mặn, Canh, Rau/Xào, Tráng miệng
 * Chọn số người ăn 2/4/6/8, lọc dị ứng, xoay vòng đổi món, thêm trọn mâm vào giỏ.
 */

import { api } from '../../services/api.js';
import { cartService } from '../../services/cart.js';
import { openCartDrawer } from './CartDrawer.js';
import { formatCurrency, escapeHtml } from '../../utils/format.js';
import { showToast } from '../../components/Toast.js';
import { Icons, iconHtml } from '../../components/icons.js';
import {
  MEAL_GROUPS,
  VALID_SERVES,
  suggestFamilyMeal,
  rotateDishAtPosition
} from '../../../../shared/familyMealAlgorithm.js';

let modalElement = null;
let allDishesCache = [];
let currentServes = 4;
let currentExcludedAllergens = [];
let currentSeed = 100;
let currentOffsets = { man: 0, canh: 0, xao_rau: 0, trang_mieng: 0 };
let currentMeal = null;

const ALLERGEN_OPTIONS = [
  { slug: 'shrimp',      label: 'Tôm / Tép' },
  { slug: 'crab',        label: 'Cua / Ghẹ' },
  { slug: 'fish',        label: 'Cá các loại' },
  { slug: 'peanuts',     label: 'Đậu phộng' },
  { slug: 'eggs',        label: 'Trứng vịt/gà' },
  { slug: 'milk',        label: 'Sữa / Bơ' },
  { slug: 'gluten',      label: 'Gluten / Bột mì' },
  { slug: 'shrimp-paste', label: 'Mắm tôm / Mắm ruốc' }
];

/** Xử lý đường dẫn ảnh */
function getDishImage(dish) {
  if (!dish || !dish.image) {
    return '/public/images/menu/placeholder.svg';
  }
  const img = dish.image;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
    return img;
  }
  return `/public/images/menu/${img}`;
}

/** Tải dữ liệu món nếu chưa có */
async function ensureDishesLoaded() {
  if (allDishesCache.length > 0) return allDishesCache;
  try {
    const res = await api.get('/dishes');
    allDishesCache = res.data || [];
  } catch (err) {
    console.error('Lỗi tải danh sách món mâm cơm:', err);
    allDishesCache = [];
  }
  return allDishesCache;
}

/** Khởi tạo modal DOM */
function createModalDOM() {
  if (modalElement) return modalElement;

  const modal = document.createElement('div');
  modal.id = 'family-meal-modal';
  modal.className = 'family-meal-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'family-meal-title');

  modal.innerHTML = `
    <div class="family-meal-modal__dialog" role="document">
      <!-- Header -->
      <div class="family-meal-header">
        <div>
          <h2 id="family-meal-title" class="family-meal-header__title">
            ${iconHtml('food')} Mâm Cơm Gia Đình Nam Bộ
          </h2>
          <p class="family-meal-header__sub">
            Gợi ý mâm tròn 4 món đậm đà chuẩn vị miền Tây: Mặn · Canh · Rau · Tráng miệng
          </p>
        </div>
        <button id="btn-close-family-meal" class="btn btn-secondary btn-icon" aria-label="Đóng mâm cơm">
          ${iconHtml('close')}
        </button>
      </div>

      <!-- Body -->
      <div class="family-meal-body">
        <!-- Cột trái: Trực quan mâm tròn SVG -->
        <div class="tray-visual-container">
          <div class="tray-svg-wrap" id="tray-svg-container">
            <!-- Injected via renderTraySvg() -->
          </div>
          <div style="margin-top: var(--space-2); text-align: center;">
            <button id="btn-randomize-meal" class="btn btn-sm btn-outline" style="border-radius: var(--radius-full); gap: 6px;">
              ${iconHtml('refresh')} Đổi gợi ý cả mâm
            </button>
          </div>
        </div>

        <!-- Cột phải: Bộ điều khiển & Danh sách 4 món -->
        <div>
          <!-- Bộ chọn số người ăn -->
          <div class="family-meal-controls">
            <label style="font-size: 0.85rem; font-weight: 700; color: var(--color-text);">
              1. Chọn số người ăn:
            </label>
            <div class="serves-pills" id="serves-pills-container">
              ${VALID_SERVES.map(s => `
                <button type="button" class="serves-btn ${s === currentServes ? 'is-active' : ''}" data-serves="${s}">
                  ${s} người
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Bộ lọc dị ứng -->
          <div class="family-meal-controls">
            <label style="font-size: 0.85rem; font-weight: 700; color: var(--color-text);">
              2. Bỏ món có dị ứng (nhấn để loại trừ):
            </label>
            <div class="allergens-pills" id="allergens-pills-container">
              ${ALLERGEN_OPTIONS.map(a => `
                <button type="button" class="allergen-chip ${currentExcludedAllergens.includes(a.slug) ? 'is-excluded' : ''}" data-allergen="${a.slug}">
                  ${a.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Danh sách 4 món với nút đổi riêng từng món -->
          <div style="margin-top: var(--space-4);">
            <label style="font-size: 0.85rem; font-weight: 700; color: var(--color-text); margin-bottom: var(--space-2); display: block;">
              3. Chi tiết 4 món trong mâm:
            </label>
            <div class="meal-items-list" id="meal-items-list-container">
              <!-- Injected via renderItemsList() -->
            </div>
          </div>
        </div>
      </div>

      <!-- Footer: Tổng tiền & CTA Thêm cả mâm -->
      <div class="family-meal-footer">
        <div class="family-meal-footer__summary">
          <span class="family-meal-footer__label" id="meal-portion-label">
            Khẩu phần 4 người (chuẩn mâm tròn)
          </span>
          <span class="family-meal-footer__total" id="meal-total-price">
            0 đ
          </span>
        </div>
        <div class="family-meal-footer__actions">
          <button id="btn-add-entire-meal" class="btn btn-primary btn-lg" style="gap: 8px;">
            ${iconHtml('cart')} Thêm Cả Mâm Vào Giỏ
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modalElement = modal;

  attachModalEvents();
  return modal;
}

/** Vẽ hình chiếc mâm tròn SVG */
function renderTraySvg() {
  const container = document.querySelector('#tray-svg-container');
  if (!container || !currentMeal) return;

  const { items } = currentMeal;
  const manItem   = items.man;
  const canhItem  = items.canh;
  const xaoItem   = items.xao_rau;
  const ngotItem  = items.trang_mieng;

  container.innerHTML = `
    <svg class="tray-svg" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradient mâm đồng Nam Bộ -->
        <radialGradient id="brassTrayGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFF5E4" />
          <stop offset="65%" stop-color="#F2D091" />
          <stop offset="90%" stop-color="#DDA050" />
          <stop offset="100%" stop-color="#A5632A" />
        </radialGradient>

        <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E9B764" />
          <stop offset="50%" stop-color="#A5632A" />
          <stop offset="100%" stop-color="#5C3310" />
        </linearGradient>

        <!-- Clip Paths cho 4 đĩa thức ăn tròn -->
        <clipPath id="clip-man"><circle cx="250" cy="95" r="48" /></clipPath>
        <clipPath id="clip-canh"><circle cx="400" cy="250" r="48" /></clipPath>
        <clipPath id="clip-xao"><circle cx="250" cy="405" r="48" /></clipPath>
        <clipPath id="clip-ngot"><circle cx="100" cy="250" r="48" /></clipPath>
      </defs>

      <!-- Vành mâm đồng ngoài -->
      <circle cx="250" cy="250" r="240" fill="url(#rimGrad)" />
      <!-- Lòng mâm đồng -->
      <circle cx="250" cy="250" r="224" fill="url(#brassTrayGrad)" stroke="#8C4E1E" stroke-width="2" />
      <!-- Họa tiết nan/vành truyền thống -->
      <circle cx="250" cy="250" r="218" fill="none" stroke="#DDA050" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6" />
      <circle cx="250" cy="250" r="145" fill="none" stroke="#A5632A" stroke-width="1" stroke-dasharray="6 4" opacity="0.3" />

      <!-- ==================== TÂM MÂM: ÂU CƠM DẺO ==================== -->
      <g id="rice-pot" transform="translate(250, 250)">
        <!-- Bóng đổ âu cơm -->
        <ellipse cx="0" cy="18" rx="42" ry="16" fill="rgba(0,0,0,0.15)" />
        <!-- Thân âu sứ men lam -->
        <circle cx="0" cy="0" r="42" fill="#FFFFFF" stroke="#3F6B3A" stroke-width="3" />
        <!-- Họa tiết hoa lam trên âu -->
        <circle cx="0" cy="0" r="37" fill="#F8FCF8" stroke="#8CB687" stroke-width="1" stroke-dasharray="3 2" />
        <!-- Cơm trắng ngọc -->
        <ellipse cx="0" cy="-2" rx="30" ry="24" fill="#FFFFFF" />
        <!-- Hạt cơm điểm xuyết -->
        <circle cx="-10" cy="-6" r="2.5" fill="#E8F0E8" />
        <circle cx="8" cy="-4" r="2" fill="#E8F0E8" />
        <circle cx="2" cy="4" r="2.2" fill="#E8F0E8" />
        <!-- Khói cơm nghi ngút SVG -->
        <path d="M -8 -16 Q -12 -28 0 -36 Q 12 -44 2 -52" fill="none" stroke="#3F6B3A" stroke-width="2" stroke-linecap="round" opacity="0.35" />
        <path d="M 6 -14 Q 16 -24 8 -34 Q 0 -42 6 -48" fill="none" stroke="#3F6B3A" stroke-width="1.5" stroke-linecap="round" opacity="0.25" />
        <!-- Chữ Âu Cơm Dẻo -->
        <text x="0" y="8" font-size="10" font-weight="800" text-anchor="middle" fill="#2E502A" font-family="system-ui, sans-serif">
          ÂU CƠM
        </text>
      </g>

      <!-- ==================== ĐĨA 1: MÓN MẶN (TOP) ==================== -->
      <g class="tray-dish-group" data-group="man" style="cursor: pointer;">
        <circle cx="250" cy="95" r="54" fill="rgba(0,0,0,0.12)" />
        <circle cx="250" cy="95" r="52" fill="#FFFFFF" stroke="#B5472A" stroke-width="3" />
        <circle cx="250" cy="95" r="48" fill="#FCEEEA" />
        <image href="${getDishImage(manItem) || '/public/images/menu/thit-kho-to-nuoc-dua-hot-vit.jpg'}" x="202" y="47" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-man)" />
        <!-- Vành đĩa sứ -->
        <circle cx="250" cy="95" r="48" fill="none" stroke="#FFFFFF" stroke-width="2" />
        <!-- Tag nhãn phía trên -->
        <rect x="210" y="30" width="80" height="20" rx="10" fill="#B5472A" />
        <text x="250" y="44" font-size="10" font-weight="700" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif">
          MÓN MẶN
        </text>
      </g>

      <!-- ==================== ĐĨA 2: MÓN CANH (RIGHT) ==================== -->
      <g class="tray-dish-group" data-group="canh" style="cursor: pointer;">
        <circle cx="400" cy="250" r="54" fill="rgba(0,0,0,0.12)" />
        <circle cx="400" cy="250" r="52" fill="#FFFFFF" stroke="#007791" stroke-width="3" />
        <circle cx="400" cy="250" r="48" fill="#E6F4F8" />
        <image href="${getDishImage(canhItem) || '/public/images/menu/canh-chua-ca-loc.jpg'}" x="352" y="202" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-canh)" />
        <circle cx="400" cy="250" r="48" fill="none" stroke="#FFFFFF" stroke-width="2" />
        <rect x="360" y="185" width="80" height="20" rx="10" fill="#007791" />
        <text x="400" y="199" font-size="10" font-weight="700" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif">
          MÓN CANH
        </text>
      </g>

      <!-- ==================== ĐĨA 3: RAU / XÀO (BOTTOM) ==================== -->
      <g class="tray-dish-group" data-group="xao_rau" style="cursor: pointer;">
        <circle cx="250" cy="405" r="54" fill="rgba(0,0,0,0.12)" />
        <circle cx="250" cy="405" r="52" fill="#FFFFFF" stroke="#3F6B3A" stroke-width="3" />
        <circle cx="250" cy="405" r="48" fill="#EFF7EE" />
        <image href="${getDishImage(xaoItem) || '/public/images/menu/goi-ngo-sen-tom-thit.jpg'}" x="202" y="357" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-xao)" />
        <circle cx="250" cy="405" r="48" fill="none" stroke="#FFFFFF" stroke-width="2" />
        <rect x="210" y="445" width="80" height="20" rx="10" fill="#3F6B3A" />
        <text x="250" y="459" font-size="10" font-weight="700" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif">
          RAU / XÀO
        </text>
      </g>

      <!-- ==================== ĐĨA 4: TRÁNG MIỆNG (LEFT) ==================== -->
      <g class="tray-dish-group" data-group="trang_mieng" style="cursor: pointer;">
        <circle cx="100" cy="250" r="54" fill="rgba(0,0,0,0.12)" />
        <circle cx="100" cy="250" r="52" fill="#FFFFFF" stroke="#E3A72F" stroke-width="3" />
        <circle cx="100" cy="250" r="48" fill="#FFF9E6" />
        <image href="${getDishImage(ngotItem) || '/public/images/menu/che-ba-ba.jpg'}" x="52" y="202" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-ngot)" />
        <circle cx="100" cy="250" r="48" fill="none" stroke="#FFFFFF" stroke-width="2" />
        <rect x="60" y="185" width="80" height="20" rx="10" fill="#C88E1B" />
        <text x="100" y="199" font-size="9" font-weight="700" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif">
          TRÁNG MIỆNG
        </text>
      </g>
    </svg>
  `;

  // Gắn sự kiện click trực tiếp vào đĩa SVG để đổi món
  container.querySelectorAll('.tray-dish-group').forEach(groupEl => {
    groupEl.addEventListener('click', () => {
      const groupKey = groupEl.getAttribute('data-group');
      if (groupKey) handleRotateDish(groupKey);
    });
  });
}

/** Render danh sách 4 thẻ món bên cạnh */
function renderItemsList() {
  const container = document.querySelector('#meal-items-list-container');
  if (!container || !currentMeal) return;

  const { items, candidateCounts } = currentMeal;

  container.innerHTML = MEAL_GROUPS.map(({ key, label }) => {
    const dish = items[key];
    const totalInGroup = candidateCounts[key] || 0;

    if (!dish) {
      return `
        <div class="meal-item-card">
          <div class="meal-item-card__info">
            <span class="meal-item-card__badge">${label}</span>
            <div class="meal-item-card__name" style="color: var(--color-danger);">
              Chưa có món phù hợp (do dị ứng)
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="meal-item-card">
        <img
          src="${getDishImage(dish)}"
          alt="${escapeHtml(dish.name)}"
          class="meal-item-card__thumb"
        />
        <div class="meal-item-card__info">
          <span class="meal-item-card__badge">${label}</span>
          <div class="meal-item-card__name" title="${escapeHtml(dish.name)}">
            ${escapeHtml(dish.name)}
          </div>
          <div class="meal-item-card__price">
            ${formatCurrency(dish.price || 0)}
          </div>
        </div>
        <button
          type="button"
          class="btn-rotate-dish"
          data-group="${key}"
          title="Đổi sang món ${label} khác trong ${totalInGroup} món"
          aria-label="Đổi món ${label}"
        >
          ${iconHtml('refresh')} Đổi
        </button>
      </div>
    `;
  }).join('');

  // Nút đổi món trên từng thẻ
  container.querySelectorAll('.btn-rotate-dish').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const groupKey = btn.getAttribute('data-group');
      if (groupKey) handleRotateDish(groupKey);
    });
  });

  // Cập nhật footer tổng tiền
  const portionLabel = document.querySelector('#meal-portion-label');
  if (portionLabel) {
    portionLabel.textContent = currentMeal.servesInfo?.label || `Khẩu phần ${currentServes} người`;
  }
  const totalPriceEl = document.querySelector('#meal-total-price');
  if (totalPriceEl) {
    totalPriceEl.textContent = formatCurrency(currentMeal.totalPrice || 0);
  }
}

/** Cập nhật UI toàn diện sau khi tính toán mâm */
function refreshMealUI() {
  currentMeal = suggestFamilyMeal({
    dishes: allDishesCache,
    serves: currentServes,
    excludeAllergens: currentExcludedAllergens,
    seed: currentSeed,
    offsets: currentOffsets
  });

  renderTraySvg();
  renderItemsList();
}

/** Xử lý khi nhấn đổi món ở 1 vị trí */
function handleRotateDish(groupKey) {
  if (!currentMeal) return;
  currentOffsets[groupKey] = (currentOffsets[groupKey] || 0) + 1;
  refreshMealUI();
  showToast(`Đã đổi sang món ${groupKey === 'man' ? 'Mặn' : (groupKey === 'canh' ? 'Canh' : (groupKey === 'xao_rau' ? 'Rau/Xào' : 'Tráng miệng'))} khác!`, 'info');
}

/** Gắn sự kiện modal */
function attachModalEvents() {
  if (!modalElement) return;

  // Nút đóng
  const closeBtn = modalElement.querySelector('#btn-close-family-meal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeFamilyMealModal);
  }

  // Backdrop click
  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement) {
      closeFamilyMealModal();
    }
  });

  // Phím Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalElement && modalElement.classList.contains('is-open')) {
      closeFamilyMealModal();
    }
  });

  // Chọn số người ăn
  const servesContainer = modalElement.querySelector('#serves-pills-container');
  if (servesContainer) {
    servesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.serves-btn');
      if (!btn) return;
      const s = parseInt(btn.getAttribute('data-serves'), 10);
      if (VALID_SERVES.includes(s)) {
        currentServes = s;
        servesContainer.querySelectorAll('.serves-btn').forEach(b => {
          b.classList.toggle('is-active', parseInt(b.getAttribute('data-serves'), 10) === currentServes);
        });
        refreshMealUI();
      }
    });
  }

  // Bật/tắt loại trừ dị ứng
  const allergensContainer = modalElement.querySelector('#allergens-pills-container');
  if (allergensContainer) {
    allergensContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.allergen-chip');
      if (!chip) return;
      const slug = chip.getAttribute('data-allergen');
      if (!slug) return;

      if (currentExcludedAllergens.includes(slug)) {
        currentExcludedAllergens = currentExcludedAllergens.filter(s => s !== slug);
        chip.classList.remove('is-excluded');
      } else {
        currentExcludedAllergens.push(slug);
        chip.classList.add('is-excluded');
      }
      refreshMealUI();
    });
  }

  // Đổi gợi ý cả mâm (random seed)
  const randBtn = modalElement.querySelector('#btn-randomize-meal');
  if (randBtn) {
    randBtn.addEventListener('click', () => {
      currentSeed = Math.floor(Math.random() * 1000) + 1;
      currentOffsets = { man: 0, canh: 0, xao_rau: 0, trang_mieng: 0 };
      refreshMealUI();
      showToast('Đã gợi ý mâm cơm sum vầy mới!', 'info');
    });
  }

  // Thêm cả mâm vào giỏ hàng
  const addAllBtn = modalElement.querySelector('#btn-add-entire-meal');
  if (addAllBtn) {
    addAllBtn.addEventListener('click', () => {
      if (!currentMeal || !currentMeal.items) return;

      const itemsToAdd = [
        currentMeal.items.man,
        currentMeal.items.canh,
        currentMeal.items.xao_rau,
        currentMeal.items.trang_mieng
      ].filter(Boolean);

      if (itemsToAdd.length === 0) {
        showToast('Chưa có món nào để thêm vào giỏ!', 'warning');
        return;
      }

      const quantity = currentMeal.servesInfo?.quantityPerDish || 1;

      for (const item of itemsToAdd) {
        cartService.addItem({
          dish_id: item.id,
          dish_name: item.name,
          dish_price: item.price,
          dish_image: item.image,
          quantity: quantity,
          note: `Mâm cơm gia đình ${currentServes} người`
        });
      }

      showToast(`Đã thêm trọn vẹn mâm cơm gia đình (${itemsToAdd.length} món) vào giỏ hàng!`, 'success');
      closeFamilyMealModal();
      openCartDrawer();
    });
  }
}

/** Mở modal Mâm Cơm Gia Đình */
export async function openFamilyMealModal() {
  createModalDOM();
  await ensureDishesLoaded();
  refreshMealUI();

  modalElement.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

/** Đóng modal */
export function closeFamilyMealModal() {
  if (!modalElement) return;
  modalElement.classList.remove('is-open');
  document.body.style.overflow = '';
}

/** Dựng HTML Banner Mâm Cơm Gia Đình cho trang chủ */
export function renderFamilyMealBannerHTML() {
  return `
    <div class="family-meal-banner">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-2); flex-wrap: wrap;">
          <span class="badge badge-amber">
            ${iconHtml('food')} Nét Đẹp Ẩm Thực Nam Bộ
          </span>
          <span class="badge badge-success">
            ⭐ Mâm Cơm Best-Seller 4 Món
          </span>
        </div>
        <h3 class="family-meal-banner__title">
          Mâm Cơm Gia Đình Sum Vầy
        </h3>
        <p class="family-meal-banner__desc">
          Mâm tròn truyền thống đủ 4 vị: <strong>1 món mặn đậm đà · 1 món canh chua thanh mát · 1 đĩa rau xào kho quẹt · 1 món tráng miệng ngọt lành</strong>. Chọn khẩu phần cho 2, 4, 6 hoặc 8 người và tùy thích đổi món chỉ bằng 1 cú chạm!
        </p>
        <div class="family-meal-banner__actions">
          <button id="btn-banner-open-family-meal" class="btn btn-primary">
            ${iconHtml('food')} Xem &amp; Chọn Mâm Cơm Ngay
          </button>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
        <svg viewBox="0 0 240 240" width="220" height="220" class="tray-svg" style="max-width: 100%; filter: drop-shadow(0 6px 16px rgba(0,0,0,0.12));">
          <defs>
            <radialGradient id="bannerBrassGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFF8E7" />
              <stop offset="70%" stop-color="#F3D49B" />
              <stop offset="100%" stop-color="#B87333" />
            </radialGradient>
            <clipPath id="clip-banner-man"><circle cx="120" cy="46" r="30" /></clipPath>
            <clipPath id="clip-banner-canh"><circle cx="194" cy="120" r="30" /></clipPath>
            <clipPath id="clip-banner-xao"><circle cx="120" cy="194" r="30" /></clipPath>
            <clipPath id="clip-banner-ngot"><circle cx="46" cy="120" r="30" /></clipPath>
            <clipPath id="clip-banner-com"><circle cx="120" cy="120" r="28" /></clipPath>
          </defs>
          <!-- Mâm đồng truyền thống -->
          <circle cx="120" cy="120" r="118" fill="#8C4E1E" />
          <circle cx="120" cy="120" r="115" fill="url(#bannerBrassGrad)" stroke="#6B3710" stroke-width="2" />
          <circle cx="120" cy="120" r="110" fill="none" stroke="#DDA050" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7" />

          <!-- Đĩa Món Mặn: Thịt kho tộ nước dừa hột vịt (trên) -->
          <circle cx="120" cy="46" r="33" fill="#FFFFFF" stroke="#B5472A" stroke-width="2.5" />
          <image href="/public/images/menu/thit-kho-to-nuoc-dua-hot-vit.jpg" x="90" y="16" width="60" height="60" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-banner-man)" />

          <!-- Tô Món Canh: Canh chua cá lóc (phải) -->
          <circle cx="194" cy="120" r="33" fill="#FFFFFF" stroke="#007791" stroke-width="2.5" />
          <image href="/public/images/menu/canh-chua-ca-loc.jpg" x="164" y="90" width="60" height="60" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-banner-canh)" />

          <!-- Đĩa Món Xào: Gỏi ngó sen tôm thịt (dưới) -->
          <circle cx="120" cy="194" r="33" fill="#FFFFFF" stroke="#3F6B3A" stroke-width="2.5" />
          <image href="/public/images/menu/goi-ngo-sen-tom-thit.jpg" x="90" y="164" width="60" height="60" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-banner-xao)" />

          <!-- Đĩa Tráng Miệng: Chè bà ba Bến Tre (trái) -->
          <circle cx="46" cy="120" r="33" fill="#FFFFFF" stroke="#E3A72F" stroke-width="2.5" />
          <image href="/public/images/menu/che-ba-ba.jpg" x="16" y="90" width="60" height="60" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-banner-ngot)" />

          <!-- Tâm mâm: Âu Cơm Trắng Dẻo Sứ Men Lam -->
          <circle cx="120" cy="120" r="31" fill="#FFFFFF" stroke="#3F6B3A" stroke-width="3" />
          <image href="/public/images/menu/com-tam-suon-bi-cha.jpg" x="92" y="92" width="56" height="56" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-banner-com)" />
          <circle cx="120" cy="120" r="28" fill="rgba(255,255,255,0.15)" stroke="#3F6B3A" stroke-width="1" />
        </svg>
        <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary); margin-top: 6px; letter-spacing: 0.04em;">MÂM BEST-SELLER 4 MÓN</span>
      </div>
    </div>
  `;
}
