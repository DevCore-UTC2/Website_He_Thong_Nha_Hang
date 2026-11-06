/**
 * CUSTOMER MENU VIEW — VỊ NHÀ MÌNH
 * Mục 3: Xem thực đơn, tìm kiếm debounce, lọc danh mục, sắp xếp giá,
 * hiển thị badge mùa vụ, VAT category, cảnh báo 18+, đặt trước & khẩu phần.
 */

import { api } from '../../services/api.js';
import { formatCurrency, escapeHtml } from '../../utils/format.js';
import { openDishDetailModal } from './DishDetailModal.js';
import { showToast } from '../../components/Toast.js';
import { Icons, iconHtml } from '../../components/icons.js';
import { triggerPressFeedback } from '../../utils/ui-feedback.js';
import {
  getCurrentSeasonMonth,
  isDishInSeason,
  getSeasonInfo,
  parseSeasonMonths
} from '../../../../shared/seasonHelper.js';

let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'popular';
let simulatedMonth = getCurrentSeasonMonth();
let debounceTimer = null;
let dishes = [];
let categories = [];
let isLoading = true;

/** Làm nổi bật từ khóa tìm kiếm trong tên món ăn */
function highlightText(text, query) {
  if (!query || !query.trim()) return escapeHtml(text);
  const safeQuery = escapeHtml(query.trim());
  const safeText = escapeHtml(text);
  try {
    const regex = new RegExp(`(${safeQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
  } catch {
    return safeText;
  }
}

/** Xử lý đường dẫn ảnh món */
function getDishImageUrl(image) {
  if (!image) {
    return '/public/images/menu/placeholder.svg';
  }
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
    return image;
  }
  return `/public/images/menu/${image}`;
}

/** Kiểm tra và render badge mùa vụ */
function renderSeasonBadge(seasonMonthsRaw) {
  if (!seasonMonthsRaw) return '';
  const months = parseSeasonMonths(seasonMonthsRaw);
  if (months.length === 0) return '';

  const inSeason = months.includes(simulatedMonth);
  if (inSeason) {
    return `<span class="badge badge-success" title="Món đang vào đúng mùa tháng ${simulatedMonth} (mùa vụ: tháng ${months.join(', ')})">${iconHtml('season')} Đúng mùa vụ (Tháng ${simulatedMonth})</span>`;
  } else {
    return `<span class="badge badge-amber" title="Mùa ngon nhất: tháng ${months.join(', ')}">${iconHtml('season')} Món theo mùa (Tháng ${months.join(', ')})</span>`;
  }
}

export async function initMenu() {
  await loadCategories();
  await loadDishes();
  renderMenu();

  // Lắng nghe khi có món ăn được thêm/sửa từ Admin thì tự động load lại
  window.addEventListener('dishes:updated', () => {
    loadCategories();
    loadDishes().then(() => renderDishGrid());
  });
}

async function loadCategories() {
  try {
    const res = await api.get('/categories');
    categories = res.data || [];
  } catch (err) {
    console.error('Lỗi tải danh mục:', err);
  }
}

async function loadDishes() {
  isLoading = true;
  renderDishGrid();

  try {
    let url = `/dishes?sort=${currentSort}`;
    if (currentCategory !== 'all' && currentCategory !== 'in_season') {
      url += `&category_id=${currentCategory}`;
    }
    if (currentSearch.trim() !== '') {
      url += `&search=${encodeURIComponent(currentSearch.trim())}`;
    }

    const res = await api.get(url);
    let loadedDishes = res.data || [];

    // Lọc theo mùa nếu chọn tab "Đang vào mùa"
    if (currentCategory === 'in_season') {
      loadedDishes = loadedDishes.filter(d => isDishInSeason(d, simulatedMonth));
    }

    dishes = loadedDishes;
  } catch (err) {
    showToast(err.message, 'error');
    dishes = [];
  } finally {
    isLoading = false;
    renderDishGrid();
  }
}

export function renderMenu() {
  const container = document.querySelector('#menu-container');
  if (!container) return;

  const seasonInfo = getSeasonInfo(simulatedMonth);

  container.innerHTML = `
    <!-- Thanh điều khiển: Tìm kiếm, Lọc danh mục, Mùa vụ & Sắp xếp giá -->
    <div style="margin-bottom: var(--space-8);">
      <div class="flex flex-col gap-4">
        <!-- Hàng 1: Ô tìm kiếm, Chọn tháng mùa vụ & Sắp xếp -->
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div style="position: relative; flex: 1; min-width: 280px; max-width: 480px;">
            <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); display: flex; align-items: center;">
              ${iconHtml('search')}
            </span>
            <input 
              type="text" 
              id="menu-search-input" 
              class="input" 
              placeholder="Tìm kiếm món ăn, hương vị, nguyên liệu..." 
              value="${escapeHtml(currentSearch)}"
              style="padding-left: 48px; border-radius: var(--radius-full);"
            />
            ${currentSearch ? `
              <button id="btn-clear-search" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); display: flex; align-items: center;" aria-label="Xóa tìm kiếm">
                ${iconHtml('close')}
              </button>
            ` : ''}
          </div>

          <!-- Bộ chọn tháng kiểm thử mùa vụ (T29) -->
          <!-- DEMO ONLY: công cụ demo mô phỏng mùa vụ cho giám khảo kiểm thử, thực tế hệ thống lấy tự động từ Date() hiện tại -->
          <div class="flex items-center gap-2" style="background: var(--color-surface); padding: 4px 12px; border-radius: var(--radius-full); border: 1px solid var(--color-border);" title="Thay đổi tháng để kiểm thử huy hiệu và món đang vào mùa">
            <span style="color: var(--color-primary); font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
              ${iconHtml('season')} Mùa vụ:
            </span>
            <select id="season-month-select" class="select" aria-label="Chọn tháng để xem món theo mùa vụ" style="width: auto; padding: 4px 8px; border: none; background: transparent; font-size: 0.85rem; font-weight: 700; cursor: pointer; color: var(--color-text);">
              <option value="1" ${simulatedMonth === 1 ? 'selected' : ''}>Tháng 1 (Giáp Tết)</option>
              <option value="2" ${simulatedMonth === 2 ? 'selected' : ''}>Tháng 2 (Đầu xuân)</option>
              <option value="3" ${simulatedMonth === 3 ? 'selected' : ''}>Tháng 3 (Mùa khô)</option>
              <option value="4" ${simulatedMonth === 4 ? 'selected' : ''}>Tháng 4 (Mùa nóng)</option>
              <option value="5" ${simulatedMonth === 5 ? 'selected' : ''}>Tháng 5 (Mùa trái cây)</option>
              <option value="6" ${simulatedMonth === 6 ? 'selected' : ''}>Tháng 6 (Trái cây rộ)</option>
              <option value="7" ${simulatedMonth === 7 ? 'selected' : ''}>Tháng 7 (Mưa đầu vụ)</option>
              <option value="8" ${simulatedMonth === 8 ? 'selected' : ''}>Tháng 8 (Nước nổi về)</option>
              <option value="9" ${simulatedMonth === 9 ? 'selected' : ''}>Tháng 9 (Nước nổi rộ)</option>
              <option value="10" ${simulatedMonth === 10 ? 'selected' : ''}>Tháng 10 (Nước nổi đỉnh)</option>
              <option value="11" ${simulatedMonth === 11 ? 'selected' : ''}>Tháng 11 (Cá linh, điên điển)</option>
              <option value="12" ${simulatedMonth === 12 ? 'selected' : ''}>Tháng 12 (Mùa gặt lúa)</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <label for="menu-sort-select" style="font-size: 0.9rem; font-weight: 600; color: var(--color-text-muted);">
              Sắp xếp:
            </label>
            <select id="menu-sort-select" class="select" style="width: auto; padding: 0.6rem 1rem; border-radius: var(--radius-md);">
              <option value="popular" ${currentSort === 'popular' ? 'selected' : ''}>Nổi bật nhất</option>
              <option value="price_asc" ${currentSort === 'price_asc' ? 'selected' : ''}>Giá tăng dần</option>
              <option value="price_desc" ${currentSort === 'price_desc' ? 'selected' : ''}>Giá giảm dần</option>
              <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Món mới nhất</option>
            </select>
          </div>
        </div>

        <!-- Hàng 2: Danh mục Pills / Tabs lướt ngang (kèm nút Đang vào mùa) -->
        <div class="flex gap-2" style="overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch;" id="category-pills">
          <button 
            class="btn btn-sm ${currentCategory === 'all' ? 'btn-primary' : 'btn-secondary'}" 
            data-cat="all"
            style="border-radius: var(--radius-full); padding: 0.5rem 1.25rem; display: inline-flex; align-items: center; gap: 6px;"
          >
            ${iconHtml('food')} Tất cả
          </button>
          <button 
            class="btn btn-sm ${currentCategory === 'in_season' ? 'btn-primary' : 'btn-secondary'}" 
            data-cat="in_season"
            style="border-radius: var(--radius-full); padding: 0.5rem 1.25rem; display: inline-flex; align-items: center; gap: 6px;"
          >
            ${iconHtml('season')} Đang vào mùa (${seasonInfo.name.split(' ')[0]} ${seasonInfo.name.split(' ')[1] || ''})
          </button>
          ${categories.map(c => `
            <button 
              class="btn btn-sm ${currentCategory == c.id ? 'btn-primary' : 'btn-secondary'}" 
              data-cat="${c.id}"
              style="border-radius: var(--radius-full); padding: 0.5rem 1.25rem; white-space: nowrap;"
            >
              ${escapeHtml(c.name)}
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Lưới danh sách món ăn -->
    <div id="dish-grid-container">
      <!-- Injected qua renderDishGrid() -->
    </div>
  `;

  attachMenuEvents();
  renderDishGrid();
}

function renderDishGrid() {
  const gridContainer = document.querySelector('#dish-grid-container');
  if (!gridContainer) return;

  // 1. Trạng thái Loading Skeletons
  if (isLoading) {
    gridContainer.innerHTML = `
      <div class="dish-grid">
        ${[1, 2, 3, 4, 5, 6].map(() => `
          <div class="card skeleton-card flex flex-col justify-between" style="padding: var(--space-4);">
            <div class="skeleton" style="width: 100%; height: 180px; border-radius: var(--radius-md);"></div>
            <div class="skeleton" style="width: 70%; height: 24px; margin-top: var(--space-3);"></div>
            <div class="skeleton" style="width: 90%; height: 16px; margin-top: var(--space-2);"></div>
            <div class="flex justify-between items-center" style="margin-top: var(--space-4);">
              <div class="skeleton" style="width: 40%; height: 28px;"></div>
              <div class="skeleton" style="width: 35%; height: 38px; border-radius: var(--radius-md);"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  // 2. Trạng thái Không tìm thấy món (Empty State)
  if (dishes.length === 0) {
    gridContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="display: flex; justify-content: center; margin-bottom: var(--space-2);">
          ${iconHtml('search')}
        </div>
        <div class="empty-title">Không tìm thấy món ăn nào</div>
        <div class="empty-desc">
          Rất tiếc, không có món nào phù hợp với từ khóa "${escapeHtml(currentSearch || 'lựa chọn này')}". Bạn hãy thử tìm từ khóa khác hoặc xóa bộ lọc nhé!
        </div>
        <button id="btn-reset-filters" class="btn btn-outline" style="margin-top: var(--space-3); display: inline-flex; align-items: center; gap: 6px;">
          ${iconHtml('filter')} Đặt lại tất cả bộ lọc
        </button>
      </div>
    `;

    const resetBtn = gridContainer.querySelector('#btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentCategory = 'all';
        currentSearch = '';
        currentSort = 'popular';
        renderMenu();
        loadDishes();
      });
    }
    return;
  }

  // 3. Render danh sách thẻ món ăn (Dish Cards)
  gridContainer.innerHTML = `
    <div class="dish-grid">
      ${dishes.map((dish, idx) => {
        const imageUrl = getDishImageUrl(dish.image);
        const seasonBadge = renderSeasonBadge(dish.season_months);
        const isAlcohol = dish.vat_category === 'alcohol' || dish.age_restricted == 1;
        const staggerIdx = Math.min(idx, 12);

        return `
        <div class="card card-hover dish-card-enter flex flex-col justify-between" data-dish-id="${dish.id}" role="article" style="height: 100%; position: relative; --dish-index: ${staggerIdx}; cursor: pointer;">
          <!-- Ảnh món và các huy hiệu -->
          <div style="position: relative; overflow: hidden; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); background: var(--color-surface-alt);">
            <img 
              src="${escapeHtml(imageUrl)}" 
              alt="${escapeHtml(dish.name)}" 
              loading="lazy"
              style="width: 100%; height: 200px; object-fit: cover; transition: transform var(--transition-normal);"
              onmouseover="this.style.transform='scale(1.05)'"
              onmouseout="this.style.transform='scale(1)'"
            />
            
            <!-- Badges góc trên trái -->
            <div style="position: absolute; top: 10px; left: 10px; display: flex; flex-direction: column; gap: 4px; z-index: 2;">
              ${dish.is_featured ? '<span class="badge badge-banchay">🔥 Bán chạy</span>' : ''}
              ${dish.is_new ? '<span class="badge badge-success">Món mới</span>' : ''}
              ${isAlcohol ? '<span class="badge badge-danger" style="font-weight: 700;">18+ (Có cồn)</span>' : ''}
              ${seasonBadge}
              ${dish.preorder_hours > 0 ? `<span class="badge badge-amber" style="display:inline-flex;align-items:center;gap:3px;">${iconHtml('clock')} Đặt trước ${dish.preorder_hours}h</span>` : ''}
            </div>

            <!-- Badge VAT góc trên phải -->
            <div style="position: absolute; top: 10px; right: 10px; z-index: 2;">
              <span class="badge" style="background: rgba(0,0,0,0.6); color: #fff; font-size: 0.65rem; -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);">
                ${dish.vat_category === 'alcohol' ? 'VAT 10%' : 'VAT 8%'}
              </span>
            </div>

            ${!dish.is_available ? `
              <div style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.7); display: flex; align-items: center; justify-content: center; z-index: 3;">
                <span class="badge badge-danger" style="font-size: 0.9rem; padding: 0.5rem 1rem;">Tạm Hết Món</span>
              </div>
            ` : ''}
          </div>

          <!-- Nội dung món -->
          <div style="padding: var(--space-4); flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="flex items-center justify-between" style="margin-bottom: var(--space-1);">
                <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--color-primary); letter-spacing: 0.05em;">
                  ${escapeHtml(dish.category_name || 'Món ngon')}
                </span>
                <span style="font-size: 0.85rem; color: var(--color-text-muted); display: inline-flex; align-items: center; gap: 3px;">
                  <span style="color: var(--color-accent); display: inline-flex;">${iconHtml('star')}</span>
                  ${dish.rating_avg || 5.0} (${dish.rating_count || 10})
                </span>
              </div>

              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: var(--space-2); color: var(--color-text-main);">
                ${highlightText(dish.name, currentSearch)}
              </h3>

              <p style="font-size: 0.875rem; line-height: 1.5; color: var(--color-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${escapeHtml(dish.description || 'Hương vị hảo hạng được chuẩn bị kỳ công bởi các đầu bếp nhà hàng.')}
              </p>

              <!-- Thông tin phụ: khẩu phần phục vụ -->
              ${dish.serves && dish.serves > 1 ? `
                <div style="margin-top: var(--space-2); font-size: 0.8rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px;">
                  <span style="display: inline-flex;">${iconHtml('user')}</span> Phần ${dish.serves} người ăn
                </div>
              ` : ''}
            </div>

            <div style="margin-top: var(--space-4); border-top: 1px solid var(--color-border); padding-top: var(--space-3);">
              <div class="flex items-center justify-between">
                <div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); line-height: 1.2;">
                    ${formatCurrency(dish.price)}
                  </div>
                  <div style="font-size: 0.7rem; color: var(--color-text-light);">
                    (Giá đã gồm VAT)
                  </div>
                  ${dish.original_price > dish.price ? `
                    <div style="font-size: 0.8rem; text-decoration: line-through; color: var(--color-text-light);">
                      ${formatCurrency(dish.original_price)}
                    </div>
                  ` : ''}
                </div>

                <button 
                  class="btn btn-primary btn-sm btn-open-detail" 
                  data-id="${dish.id}"
                  ${!dish.is_available ? 'disabled' : ''}
                  style="border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: 6px;"
                >
                  ${iconHtml('cart')} Đặt món
                </button>
              </div>
            </div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  `;

  // Gắn sự kiện click mở modal chi tiết món cho nút đặt món
  gridContainer.querySelectorAll('.btn-open-detail').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      try {
        btn.disabled = true;
        btn.textContent = 'Đang tải...';
        const res = await api.get(`/dishes/${id}`);
        if (res.data) {
          openDishDetailModal(res.data);
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `${iconHtml('cart')} Đặt món`;
      }
    });
  });

  // Gắn sự kiện click vào thân thẻ món ăn để xem chi tiết Quick View (Master Prompt Phần 5.4)
  gridContainer.querySelectorAll('.dish-card-enter').forEach(card => {
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-open-detail')) return;
      const id = card.getAttribute('data-dish-id');
      if (!id) return;
      try {
        const res = await api.get(`/dishes/${id}`);
        if (res.data) {
          openDishDetailModal(res.data);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function attachMenuEvents() {
  // Tìm kiếm với Debounce 300ms
  const searchInput = document.querySelector('#menu-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearch = e.target.value;
        loadDishes();
      }, 300);
    });
  }

  // Nút xóa nhanh ô tìm kiếm
  const clearBtn = document.querySelector('#btn-clear-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentSearch = '';
      const input = document.querySelector('#menu-search-input');
      if (input) input.value = '';
      loadDishes();
    });
  }

  // Sắp xếp
  const sortSelect = document.querySelector('#menu-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      loadDishes();
    });
  }

  // Chọn danh mục kèm phản hồi xúc giác và hiệu ứng chuyển cảnh mượt mà
  const catPills = document.querySelectorAll('#category-pills button');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      triggerPressFeedback(pill);
      catPills.forEach(p => {
        p.className = 'btn btn-sm btn-secondary';
        p.style.borderRadius = 'var(--radius-full)';
      });
      pill.className = 'btn btn-sm btn-primary';
      pill.style.borderRadius = 'var(--radius-full)';

      currentCategory = pill.getAttribute('data-cat');

      const grid = document.querySelector('#dish-grid-container .dish-grid');
      if (grid && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        grid.classList.add('dish-grid--exit');
        setTimeout(() => loadDishes(), 90);
      } else {
        loadDishes();
      }
    });
  });

  // Thay đổi tháng mô phỏng mùa vụ (T29)
  const monthSelect = document.querySelector('#season-month-select');
  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      const newMonth = parseInt(e.target.value, 10);
      if (newMonth >= 1 && newMonth <= 12) {
        simulatedMonth = newMonth;
        try {
          sessionStorage.setItem('vnm_test_month', newMonth);
        } catch {}
        renderMenu();
        loadDishes();
        showToast(`Đã chuyển sang mô phỏng tháng ${newMonth}: ${getSeasonInfo(newMonth).name}`, 'info');
      }
    });
  }
}


