/**
 * BESTSELLER SECTION — VỊ NHÀ MÌNH
 * Hiển thị các món bán chạy / nổi bật nhất tại trang chủ (tối đa 6-8 món)
 * Kèm nút chuyển hướng "Xem toàn bộ menu" sang trang menu.html
 */

import { api } from '../../services/api.js';
import { formatCurrency, escapeHtml } from '../../utils/format.js';
import { openDishDetailModal } from './DishDetailModal.js';
import { showToast } from '../../components/Toast.js';
import { Icons, iconHtml } from '../../components/icons.js';

let bestsellers = [];
let isLoading = true;

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

export async function initBestsellerSection() {
  await loadBestsellers();
}

async function loadBestsellers() {
  isLoading = true;
  renderBestsellerGrid();

  try {
    // Ưu tiên gọi endpoint chuyên dụng /dishes/bestsellers, nếu chưa có thì fallback sang /dishes?featured=true
    let res;
    try {
      res = await api.get('/dishes/bestsellers?limit=8');
    } catch {
      res = await api.get('/dishes?featured=true&sort=popular');
    }

    let loaded = (res && res.data) || [];
    if (!Array.isArray(loaded) || loaded.length === 0) {
      // Fallback nếu không có món featured, lấy món có rating cao nhất
      const allRes = await api.get('/dishes?sort=popular');
      loaded = (allRes && allRes.data) || [];
    }

    // Giới hạn tối đa 6 - 8 món
    bestsellers = loaded.slice(0, 8);
  } catch (err) {
    console.error('Lỗi tải danh sách món bán chạy:', err);
    bestsellers = [];
  } finally {
    isLoading = false;
    renderBestsellerGrid();
  }
}

export function renderBestsellerGrid() {
  const container = document.querySelector('#bestseller-container') || document.querySelector('#menu-container');
  if (!container) return;

  if (isLoading) {
    container.innerHTML = `
      <div class="dish-grid">
        ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `
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

  if (bestsellers.length === 0) {
    container.innerHTML = `
      <div class="empty-state text-center" style="padding: var(--space-8) 0;">
        <p style="color: var(--color-text-muted);">Đang cập nhật danh sách món bán chạy hôm nay.</p>
        <div style="margin-top: var(--space-4);">
          <a href="/menu.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
            <span>Xem Toàn Bộ Thực Đơn</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="dish-grid">
      ${bestsellers.map((dish, idx) => {
        const imageUrl = getDishImageUrl(dish.image);
        const staggerIdx = Math.min(idx, 8);

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
              <span class="badge badge-banchay">🔥 Bán chạy</span>
              ${dish.is_new ? '<span class="badge badge-success">Món mới</span>' : ''}
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
                  ${escapeHtml(dish.category_name || 'Đặc sản')}
                </span>
                <span style="font-size: 0.85rem; color: var(--color-text-muted); display: inline-flex; align-items: center; gap: 3px;">
                  <span style="color: var(--color-accent); display: inline-flex;">${iconHtml('star')}</span>
                  ${dish.rating_avg || 5.0} (${dish.rating_count || 10})
                </span>
              </div>

              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: var(--space-2); color: var(--color-text-main);">
                ${escapeHtml(dish.name)}
              </h3>

              <p style="font-size: 0.875rem; line-height: 1.5; color: var(--color-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${escapeHtml(dish.description || 'Hương vị hảo hạng được chuẩn bị kỳ công bởi các đầu bếp nhà hàng.')}
              </p>
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

    <!-- Nút xem toàn bộ thực đơn dẫn sang trang Menu riêng -->
    <div class="text-center" style="margin-top: var(--space-10); text-align: center;">
      <a 
        href="/menu.html" 
        id="btn-view-all-menu" 
        class="btn btn-hero-primary btn-lg" 
        style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0.9rem 2.2rem; font-size: 1.05rem; font-weight: 700; box-shadow: var(--shadow-md); border-radius: var(--radius-full);"
      >
        <span>Xem Toàn Bộ Thực Đơn (Hơn 90 Món Đặc Sản)</span>
        <span aria-hidden="true" style="font-size: 1.2rem;">&rarr;</span>
      </a>
    </div>
  `;

  // Gắn sự kiện click mở modal chi tiết món
  container.querySelectorAll('.btn-open-detail').forEach(btn => {
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

  container.querySelectorAll('.dish-card-enter').forEach(card => {
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-open-detail') || e.target.closest('#btn-view-all-menu')) return;
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
