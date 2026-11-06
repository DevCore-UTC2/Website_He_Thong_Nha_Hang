/**
 * ADMIN & MANAGEMENT DASHBOARD (ĐẦY ĐỦ CÁC MỤC 2, 13, 15, 16, 17)
 * Áp dụng skills: backend-development-feature-development, ui-ux-designer, sql-pro
 */

import { api } from '../../services/api.js';
import { formatCurrency, formatDate, escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { showToast } from '../../components/Toast.js';
import { updateStoreStatus } from '../../services/storeService.js';

let adminModalEl = null;
let currentTab = 'dishes'; // 'dishes' | 'categories' | 'dashboard' | 'inventory' | 'staff' | 'reviews'
let dishList = [];
let categoryList = [];
let editingDish = null;

export function openAdminManager(defaultTab = 'dishes') {
  currentTab = defaultTab;

  if (!adminModalEl) {
    adminModalEl = document.createElement('div');
    adminModalEl.className = 'modal-backdrop';
    document.body.appendChild(adminModalEl);

    adminModalEl.addEventListener('click', (e) => {
      if (e.target === adminModalEl) closeAdminManager();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && adminModalEl.classList.contains('active')) {
        closeAdminManager();
      }
    });
  }

  if (!adminModalEl.classList.contains('active')) {
    adminModalEl.classList.add('active');
    lockScroll();
  }
  loadAdminData();
}

export function closeAdminManager() {
  if (adminModalEl && adminModalEl.classList.contains('active')) {
    adminModalEl.classList.remove('active');
    unlockScroll();
  }
}

async function loadAdminData() {
  try {
    const [resCats, resDishes] = await Promise.all([
      api.get('/categories'),
      api.get('/dishes')
    ]);

    categoryList = resCats.data || [];
    dishList = resDishes.data || [];
    renderAdminUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminUI() {
  adminModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 1050px; max-height: 94vh; max-height: 94dvh;">
      <div class="modal-header">
        <div class="flex items-center gap-3">
          <span style="font-size: 1.5rem;">⚙️</span>
          <div>
            <h3 style="font-size: 1.25rem;">Hệ Thống Quản Trị Nhà Hàng Toàn Diện</h3>
            <p style="font-size: 0.85rem; margin: 0;">Quản lý toàn bộ món ăn, kho bãi, nhân sự, doanh thu và đánh giá</p>
          </div>
        </div>
        <button id="btn-admin-close" class="btn-icon" title="Đóng">&times;</button>
      </div>

      <!-- Thanh điều khiển Store Status (Mục 1) -->
      <div class="store-control-bar" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); padding: 10px var(--space-4); background: rgba(214, 163, 74, 0.12); border-bottom: 1px solid var(--color-border); font-size: 0.85rem; width: 100%; box-sizing: border-box; overflow: visible;">
        <div class="flex items-center gap-2" style="flex-wrap: wrap; align-items: center;">
          <strong style="line-height: 1.5;">🏪 Trạng thái nhà hàng:</strong>
          <span id="admin-store-status-badge" class="badge badge-amber" style="line-height: 1.2;">Đang tải...</span>
        </div>
        <div class="flex items-center gap-2" style="flex-wrap: wrap; align-items: center; max-width: 100%;">
          <label for="select-store-mode" style="margin: 0; line-height: 1.5; font-weight: 700;">Chế độ mở/đóng cửa:</label>
          <select id="select-store-mode" class="select" style="width: auto; min-width: 110px; height: 36px; min-height: 36px; padding: 4px 10px; font-size: 0.85rem; border-radius: var(--radius-sm); font-weight: 600; box-sizing: border-box; margin: 0; line-height: 1.5;">
            <option value="auto">Tự động</option>
            <option value="force_open">Mở</option>
            <option value="force_closed">Đóng</option>
          </select>
        </div>
      </div>

      <!-- Navigation Tabs (T1.2, T1.3: Căn chỉnh tab cao đồng đều, icon + chữ thẳng hàng, khoảng cách đều, tab đang chọn nổi bật) -->
      <div class="admin-tabs-nav" style="display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-3) var(--space-6); background-color: var(--color-surface-alt); border-bottom: 1px solid var(--color-border); overflow: visible;">
        <button id="tab-btn-dishes" class="btn btn-sm admin-tab-btn ${currentTab === 'dishes' ? 'btn-primary admin-tab-btn--active' : 'btn-secondary'}">
          🍲 Món Ăn (${dishList.length})
        </button>
        <button id="tab-btn-categories" class="btn btn-sm admin-tab-btn ${currentTab === 'categories' ? 'btn-primary admin-tab-btn--active' : 'btn-secondary'}">
          📂 Danh Mục (${categoryList.length})
        </button>
        <button id="tab-btn-dashboard" class="btn btn-sm admin-tab-btn ${currentTab === 'dashboard' ? 'btn-primary admin-tab-btn--active' : 'btn-secondary'}">
          📊 Doanh Thu &amp; Thống Kê
        </button>
        <button id="tab-btn-inventory" class="btn btn-sm admin-tab-btn ${currentTab === 'inventory' ? 'btn-primary admin-tab-btn--active' : 'btn-secondary'}">
          📦 Kho &amp; Cảnh Báo
        </button>
        <button id="tab-btn-staff" class="btn btn-sm admin-tab-btn ${currentTab === 'staff' ? 'btn-primary admin-tab-btn--active' : 'btn-secondary'}">
          👥 Nhân Viên &amp; Quyền
        </button>
        <button id="tab-btn-reviews" class="btn btn-sm admin-tab-btn ${currentTab === 'reviews' ? 'btn-primary admin-tab-btn--active' : 'btn-secondary'}">
          ⭐ Duyệt Đánh Giá
        </button>
      </div>

      <div class="modal-body" id="admin-tab-body" style="padding: var(--space-6);">
        <!-- Nội dung từng Tab được nạp động -->
      </div>
    </div>
  `;

  attachTabButtons();
  loadCurrentTabContent();
}

function attachTabButtons() {
  const closeBtn = adminModalEl.querySelector('#btn-admin-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAdminManager);

  // Khởi tạo và lắng nghe điều khiển Store Status
  const storeBadge = adminModalEl.querySelector('#admin-store-status-badge');
  const storeSelect = adminModalEl.querySelector('#select-store-mode');
  if (storeBadge && storeSelect) {
    api.get('/store/status').then(res => {
      if (res && res.data) {
        storeSelect.value = res.data.mode;
        storeBadge.className = `badge ${res.data.is_open ? 'badge-success' : 'badge-danger'}`;
        storeBadge.textContent = res.data.is_open ? 'Đang Mở Cửa' : 'Đã Đóng Cửa';
        updateStoreStatus(res.data);
      }
    }).catch(() => {});

    storeSelect.addEventListener('change', async (e) => {
      try {
        const newMode = e.target.value;
        const res = await api.put('/store/status', { mode: newMode });
        if (res && res.data) {
          storeBadge.className = `badge ${res.data.is_open ? 'badge-success' : 'badge-danger'}`;
          storeBadge.textContent = res.data.is_open ? 'Đang Mở Cửa' : 'Đã Đóng Cửa';
          updateStoreStatus(res.data);
          showToast(res.message || 'Đã cập nhật trạng thái hoạt động nhà hàng!', 'success');
        }
      } catch (err) {
        showToast(err.message || 'Lỗi cập nhật trạng thái nhà hàng', 'error');
      }
    });
  }

  // Đảm bảo tab đang chọn luôn thấy rõ trong viewport
  const activeBtn = adminModalEl.querySelector(`#tab-btn-${currentTab}`);
  if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
    activeBtn.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }

  const tabs = ['dishes', 'categories', 'dashboard', 'inventory', 'staff', 'reviews'];
  tabs.forEach(t => {
    const btn = adminModalEl.querySelector(`#tab-btn-${t}`);
    if (btn) {
      btn.addEventListener('click', () => {
        currentTab = t;
        renderAdminUI();
      });
    }
  });
}

function loadCurrentTabContent() {
  const body = adminModalEl.querySelector('#admin-tab-body');
  if (!body) return;

  if (currentTab === 'dishes') {
    body.innerHTML = renderDishesManager();
    attachDishesEvents();
  } else if (currentTab === 'categories') {
    body.innerHTML = renderCategoriesManager();
    attachCategoriesEvents();
  } else if (currentTab === 'dashboard') {
    body.innerHTML = '<div style="text-align: center; padding: 2rem;">Đang nạp số liệu thống kê...</div>';
    loadDashboardTab(body);
  } else if (currentTab === 'inventory') {
    body.innerHTML = '<div style="text-align: center; padding: 2rem;">Đang kiểm tra tồn kho...</div>';
    loadInventoryTab(body);
  } else if (currentTab === 'staff') {
    body.innerHTML = '<div style="text-align: center; padding: 2rem;">Đang tải danh sách nhân viên...</div>';
    loadStaffTab(body);
  } else if (currentTab === 'reviews') {
    body.innerHTML = '<div style="text-align: center; padding: 2rem;">Đang tải đánh giá khách hàng...</div>';
    loadReviewsTab(body);
  }
}

// ----------------- TAB 1: MÓN ĂN (Mục 2) -----------------
function renderDishesManager() {
  return `
    <div>
      <div class="flex items-center justify-between" style="margin-bottom: var(--space-4);">
        <h4 style="font-size: 1.1rem;">Danh Sách Món Ăn Trong Thực Đơn</h4>
        <button id="btn-open-add-dish" class="btn btn-primary btn-sm">➕ Thêm Món Ăn Mới</button>
      </div>

      <div id="dish-form-container" style="display: none; margin-bottom: var(--space-6); padding: var(--space-4); border: 1.5px solid var(--color-primary); border-radius: var(--radius-lg); background-color: var(--color-surface-alt);"></div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width: 70px;">Ảnh</th>
              <th>Tên Món</th>
              <th>Danh Mục</th>
              <th>Giá Bán</th>
              <th>Trạng Thái</th>
              <th style="text-align: right;">Hành Động</th>
            </tr>
          </thead>
          <tbody>
            ${dishList.map(dish => `
              <tr>
                <td>
                  <img 
                    src="${escapeHtml(dish.image || '/public/images/menu/placeholder.svg')}" 
                    alt="${escapeHtml(dish.name)}" 
                    style="width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--color-border);" 
                  />
                </td>
                <td>
                  <div style="font-weight: 700;">${escapeHtml(dish.name)}</div>
                  <div style="font-size: 0.8rem; color: var(--color-text-muted); display: flex; gap: 4px; margin-top: 2px;">
                    ${dish.is_featured ? '<span class="badge badge-banchay" style="font-size: 0.65rem;">Bán chạy</span>' : ''}
                    ${dish.is_new ? '<span class="badge badge-success" style="font-size: 0.65rem;">Mới</span>' : ''}
                  </div>
                </td>
                <td>${escapeHtml(dish.category_name || 'Chưa phân loại')}</td>
                <td style="font-weight: 700; color: var(--color-primary);">${formatCurrency(dish.price)}</td>
                <td>
                  <button class="btn-toggle-dish btn btn-sm ${dish.is_available ? 'badge-success' : 'badge-danger'}" data-id="${dish.id}" style="padding: 4px 8px; border: none; cursor: pointer;">
                    ${dish.is_available ? '● Còn món' : '○ Hết món'}
                  </button>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-secondary btn-sm btn-edit-dish" data-id="${dish.id}" style="margin-right: 4px;">Sửa</button>
                  <button class="btn btn-danger btn-sm btn-delete-dish" data-id="${dish.id}">Xóa</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDishForm(dish = null) {
  editingDish = dish;
  const isEdit = !!dish;
  const currentImg = dish && dish.image ? dish.image : '';

  return `
    <h4 style="font-size: 1.15rem; margin-bottom: var(--space-3); color: var(--color-primary);">
      ${isEdit ? `✏️ Chỉnh Sửa Món: "${escapeHtml(dish.name)}"` : '➕ Thêm Món Ăn Mới'}
    </h4>
    <form id="form-dish-save">
      <div class="grid-admin-split-2-1" style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-4);">
        <div class="form-group">
          <label class="form-label" for="dish-f-name">Tên món (*):</label>
          <input type="text" id="dish-f-name" class="input" value="${dish ? escapeHtml(dish.name) : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="dish-f-category">Danh mục (*):</label>
          <select id="dish-f-category" class="select" required>
            ${categoryList.map(c => `<option value="${c.id}" ${dish && dish.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.icon || '')} ${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid-3col" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-4);">
        <div class="form-group">
          <label class="form-label" for="dish-f-price">Giá bán (*):</label>
          <input type="number" id="dish-f-price" class="input" value="${dish ? dish.price : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="dish-f-original-price">Giá gốc:</label>
          <input type="number" id="dish-f-original-price" class="input" value="${dish ? dish.original_price : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="dish-f-spice">Độ cay tối đa (0-4):</label>
          <select id="dish-f-spice" class="select">
            <option value="0" ${dish && dish.spice_levels_allowed === 0 ? 'selected' : ''}>0 - Không cay</option>
            <option value="1" ${dish && dish.spice_levels_allowed === 1 ? 'selected' : ''}>1 - Cay nhẹ</option>
            <option value="2" ${dish && dish.spice_levels_allowed === 2 ? 'selected' : ''}>2 - Cay vừa</option>
            <option value="3" ${dish && dish.spice_levels_allowed === 3 ? 'selected' : ''}>3 - Cay nhiều</option>
            <option value="4" ${!dish || dish.spice_levels_allowed === 4 ? 'selected' : ''}>4 - Siêu cay</option>
          </select>
        </div>
      </div>

      <!-- Ô URL Ảnh & Khung xem trước ảnh -->
      <div class="form-group">
        <label class="form-label" for="dish-f-image">Đường dẫn ảnh (URL):</label>
        <input 
          type="text" 
          id="dish-f-image" 
          class="input" 
          value="${escapeHtml(currentImg)}" 
          placeholder="http://, https:// hoặc /public/images/menu/ten-mon.jpg (để trống sẽ dùng ảnh mặc định)" 
        />
        <div id="dish-img-preview-wrap" style="margin-top: var(--space-2); display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2); background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-md);">
          <img 
            id="dish-img-preview" 
            src="${currentImg || '/public/images/menu/placeholder.svg'}" 
            alt="Xem trước ảnh" 
            style="width: 72px; height: 72px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--color-border);" 
          />
          <div>
            <div id="dish-img-status" style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted);">
              ${currentImg ? 'Ảnh hiện tại' : 'Ảnh mặc định (placeholder.svg)'}
            </div>
            <div style="font-size: 0.75rem; color: var(--color-text-light); margin-top: 2px;">
              Hỗ trợ: URL ngoài (http/https) hoặc đường dẫn nội bộ (/public/images/...)
            </div>
          </div>
        </div>
      </div>

      <!-- Ô Mô tả textarea 3-4 dòng có đếm ký tự (tối đa 500) -->
      <div class="form-group">
        <div class="flex justify-between items-center" style="margin-bottom: var(--space-1);">
          <label class="form-label" for="dish-f-desc" style="margin-bottom: 0;">Mô tả món ăn:</label>
          <span id="dish-desc-count" style="font-size: 0.75rem; color: var(--color-text-muted);">
            ${dish && dish.description ? dish.description.length : 0} / 500
          </span>
        </div>
        <textarea id="dish-f-desc" class="textarea" rows="3" maxlength="500" placeholder="Mô tả hương vị đậm đà, nguồn gốc đặc sản...">${dish ? escapeHtml(dish.description || '') : ''}</textarea>
      </div>

      <!-- Các trường bổ sung: Thời gian chế biến, Trạng thái, Nổi bật, Món mới -->
      <div class="grid-admin-split-2-1" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-3);">
        <div class="form-group">
          <label class="form-label" for="dish-f-prep">Thời gian chế biến (phút):</label>
          <input type="number" id="dish-f-prep" class="input" min="1" max="180" value="${dish ? (dish.prep_minutes || 15) : 15}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="dish-f-available">Trạng thái phục vụ:</label>
          <select id="dish-f-available" class="select">
            <option value="1" ${!dish || dish.is_available ? 'selected' : ''}>● Còn món (đang phục vụ)</option>
            <option value="0" ${dish && !dish.is_available ? 'selected' : ''}>○ Hết món (tạm ngưng)</option>
          </select>
        </div>
      </div>

      <div style="display: flex; gap: var(--space-6); align-items: center; margin-bottom: var(--space-4); padding: var(--space-2) var(--space-3); background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
        <label style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; color: var(--color-text);">
          <input type="checkbox" id="dish-f-featured" ${dish && dish.is_featured ? 'checked' : ''} />
          ⭐ Món nổi bật (Bán chạy)
        </label>
        <label style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; color: var(--color-text);">
          <input type="checkbox" id="dish-f-new" ${dish && dish.is_new ? 'checked' : ''} />
          🌱 Món mới
        </label>
      </div>

      <div class="flex justify-end gap-2">
        <button type="button" id="btn-cancel-dish-form" class="btn btn-secondary">Hủy</button>
        <button type="submit" id="btn-save-dish-submit" class="btn btn-primary">💾 Lưu Món Ăn</button>
      </div>
    </form>
  `;
}

function attachDishesEvents() {
  const addBtn = adminModalEl.querySelector('#btn-open-add-dish');
  const formContainer = adminModalEl.querySelector('#dish-form-container');

  if (addBtn && formContainer) {
    addBtn.addEventListener('click', () => {
      formContainer.innerHTML = renderDishForm(null);
      formContainer.style.display = 'block';
      attachDishFormEvents();
    });
  }

  adminModalEl.querySelectorAll('.btn-edit-dish').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const dish = dishList.find(d => d.id === id);
      if (dish && formContainer) {
        formContainer.innerHTML = renderDishForm(dish);
        formContainer.style.display = 'block';
        attachDishFormEvents();
      }
    });
  });

  adminModalEl.querySelectorAll('.btn-toggle-dish').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await api.patch(`/dishes/${id}/toggle`, {});
      loadAdminData();
    });
  });

  adminModalEl.querySelectorAll('.btn-delete-dish').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Bạn có chắc chắn muốn xóa món này?')) {
        await api.delete(`/dishes/${id}`);
        loadAdminData();
      }
    });
  });
}

function attachDishFormEvents() {
  const cancelBtn = adminModalEl.querySelector('#btn-cancel-dish-form');
  const formContainer = adminModalEl.querySelector('#dish-form-container');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      formContainer.style.display = 'none';
      formContainer.innerHTML = '';
    });
  }

  // Khung xem trước ảnh (preview) với debounce & kiểm tra tải ảnh
  const imgInput = adminModalEl.querySelector('#dish-f-image');
  const imgPreview = adminModalEl.querySelector('#dish-img-preview');
  const imgStatus = adminModalEl.querySelector('#dish-img-status');
  const submitBtn = adminModalEl.querySelector('#btn-save-dish-submit');
  let debounceTimer = null;
  let isImageValid = true;

  if (imgInput && imgPreview && imgStatus) {
    imgInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const val = imgInput.value.trim();
        if (!val) {
          imgPreview.src = '/public/images/menu/placeholder.svg';
          imgStatus.textContent = 'Sẽ dùng ảnh mặc định (placeholder.svg)';
          imgStatus.style.color = 'var(--color-text-muted)';
          isImageValid = true;
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        // Kiểm tra format: bắt buộc http://, https:// hoặc /public/images/
        const isLocal = val.startsWith('/public/images/');
        let isValidHttp = false;
        if (!isLocal) {
          try {
            const parsed = new URL(val);
            isValidHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            isValidHttp = false;
          }
        }

        if (!isLocal && !isValidHttp) {
          imgPreview.src = '/public/images/menu/placeholder.svg';
          imgStatus.textContent = '❌ URL phải bắt đầu bằng http://, https:// hoặc /public/images/';
          imgStatus.style.color = 'var(--color-danger)';
          isImageValid = false;
          if (submitBtn) submitBtn.disabled = true;
          return;
        }

        imgStatus.textContent = '⏳ Đang kiểm tra ảnh...';
        imgStatus.style.color = 'var(--color-text-muted)';

        const testImg = new Image();
        testImg.onload = () => {
          imgPreview.src = val;
          imgStatus.textContent = '✅ Đã tải ảnh thành công';
          imgStatus.style.color = 'var(--color-success)';
          isImageValid = true;
          if (submitBtn) submitBtn.disabled = false;
        };
        testImg.onerror = () => {
          imgPreview.src = '/public/images/menu/placeholder.svg';
          imgStatus.textContent = '❌ Không tải được ảnh từ đường dẫn này';
          imgStatus.style.color = 'var(--color-danger)';
          isImageValid = false;
          if (submitBtn) submitBtn.disabled = true;
        };
        testImg.src = val;
      }, 400);
    });
  }

  // Đếm ký tự cho ô mô tả
  const descInput = adminModalEl.querySelector('#dish-f-desc');
  const descCounter = adminModalEl.querySelector('#dish-desc-count');
  if (descInput && descCounter) {
    descInput.addEventListener('input', () => {
      descCounter.textContent = `${descInput.value.length} / 500`;
    });
  }

  const form = adminModalEl.querySelector('#form-dish-save');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isImageValid) {
        showToast('Vui lòng sửa đường dẫn ảnh hợp lệ hoặc để trống để dùng ảnh mặc định.', 'error');
        return;
      }

      const payload = {
        name: adminModalEl.querySelector('#dish-f-name').value.trim(),
        category_id: parseInt(adminModalEl.querySelector('#dish-f-category').value, 10),
        price: parseFloat(adminModalEl.querySelector('#dish-f-price').value),
        original_price: parseFloat(adminModalEl.querySelector('#dish-f-original-price').value) || 0,
        spice_levels_allowed: parseInt(adminModalEl.querySelector('#dish-f-spice').value, 10),
        image: adminModalEl.querySelector('#dish-f-image').value.trim(),
        description: adminModalEl.querySelector('#dish-f-desc').value.trim(),
        prep_minutes: parseInt(adminModalEl.querySelector('#dish-f-prep')?.value, 10) || 15,
        is_available: parseInt(adminModalEl.querySelector('#dish-f-available')?.value, 10) === 1,
        is_featured: adminModalEl.querySelector('#dish-f-featured')?.checked || false,
        is_new: adminModalEl.querySelector('#dish-f-new')?.checked || false
      };

      try {
        if (editingDish) {
          await api.put(`/dishes/${editingDish.id}`, payload);
          showToast('Đã cập nhật món ăn thành công!', 'success');
        } else {
          await api.post('/dishes', payload);
          showToast('Đã thêm món ăn mới!', 'success');
        }
        formContainer.style.display = 'none';
        loadAdminData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

// ----------------- TAB 2: DANH MỤC -----------------
function renderCategoriesManager() {
  return `
    <div class="grid-admin-split-1-2" style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-6);">
      <div class="card" style="padding: var(--space-4);">
        <h4 style="margin-bottom: var(--space-3);">Thêm Danh Mục</h4>
        <form id="form-add-category">
          <div class="form-group">
            <label class="form-label">Tên danh mục:</label>
            <input type="text" id="cat-name" class="input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Emoji Icon:</label>
            <input type="text" id="cat-icon" class="input" placeholder="🍲" />
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Lưu Danh Mục</button>
        </form>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr><th>Icon</th><th>Tên Danh Mục</th><th>Số Món</th><th>Xóa</th></tr>
          </thead>
          <tbody>
            ${categoryList.map(c => `
              <tr>
                <td>${escapeHtml(c.icon || '🍽️')}</td>
                <td style="font-weight: 700;">${escapeHtml(c.name)}</td>
                <td>${c.dish_count || 0}</td>
                <td><button class="btn btn-danger btn-sm btn-del-cat" data-id="${c.id}">Xóa</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function attachCategoriesEvents() {
  const form = adminModalEl.querySelector('#form-add-category');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = adminModalEl.querySelector('#cat-name').value.trim();
      const icon = adminModalEl.querySelector('#cat-icon').value.trim();
      await api.post('/categories', { name, icon });
      loadAdminData();
    });
  }

  adminModalEl.querySelectorAll('.btn-del-cat').forEach(b => {
    b.addEventListener('click', async () => {
      const id = b.getAttribute('data-id');
      if (confirm('Xóa danh mục này?')) {
        await api.delete(`/categories/${id}`);
        loadAdminData();
      }
    });
  });
}

// ----------------- TAB 3: DASHBOARD DOANH THU (Mục 16) -----------------
async function loadDashboardTab(body) {
  try {
    const res = await api.get('/dashboard/stats');
    const data = res.data;
    const ov = data.overview;
    const token = localStorage.getItem('vnm_token') || localStorage.getItem('vinhaminh_token') || localStorage.getItem('smartbite_token') || '';

    body.innerHTML = `
      <div>
        <div class="flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <h4 style="font-size: 1.2rem; font-weight: 800;">Báo Cáo Tình Hình Kinh Doanh</h4>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">Thống kê doanh số, số đơn hàng và hiệu suất bán</p>
          </div>
          <a href="/api/dashboard/export-csv?token=${encodeURIComponent(token)}" class="btn btn-primary btn-sm" download>
            📥 Xuất Báo Cáo CSV (Excel)
          </a>
        </div>

        <!-- 4 Thẻ số liệu chính -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          <div class="card" style="padding: var(--space-4); border-left: 4px solid var(--color-primary);">
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">Doanh thu hôm nay</span>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--color-primary);">${formatCurrency(ov.today_revenue)}</div>
          </div>
          <div class="card" style="padding: var(--space-4); border-left: 4px solid var(--color-success);">
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">Tổng doanh thu</span>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--color-success);">${formatCurrency(ov.total_revenue)}</div>
          </div>
          <div class="card" style="padding: var(--space-4); border-left: 4px solid var(--color-info);">
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">Tổng số đơn</span>
            <div style="font-size: 1.5rem; font-weight: 800;">${ov.total_orders} <span style="font-size: 0.9rem; font-weight: 500;">đơn</span></div>
          </div>
          <div class="card" style="padding: var(--space-4); border-left: 4px solid var(--color-secondary);">
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">Tổng khách hàng</span>
            <div style="font-size: 1.5rem; font-weight: 800;">${ov.total_customers} <span style="font-size: 0.9rem; font-weight: 500;">người</span></div>
          </div>
        </div>

        <!-- Top món bán chạy nhất -->
        <h4 style="font-size: 1.05rem; margin-bottom: var(--space-3);">🔥 Top Món Ăn Bán Chạy Nhất:</h4>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Món Ăn</th><th>Số Lượng Bán</th><th>Doanh Thu</th></tr>
            </thead>
            <tbody>
              ${(data.topDishes || []).map(td => `
                <tr>
                  <td style="font-weight: 700;">${escapeHtml(td.dish_name)}</td>
                  <td>${td.total_sold} phần</td>
                  <td style="color: var(--color-primary); font-weight: 700;">${formatCurrency(td.total_revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color: red;">Lỗi tải thống kê: ${escapeHtml(err.message)}</div>`;
  }
}

// ----------------- TAB 4: KHO & CẢNH BÁO TỒN THẤP (Mục 15) -----------------
async function loadInventoryTab(body) {
  try {
    const res = await api.get('/inventory');
    const items = res.data || [];

    body.innerHTML = `
      <div>
        <div class="flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800;">Quản Lý Kho Nguyên Liệu & Cảnh Báo Tồn</h4>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">Tự động cảnh báo đỏ khi nguyên liệu xuống dưới mức an toàn</p>
          </div>
          ${res.low_stock_count > 0 ? `
            <span class="badge badge-danger" style="font-size: 0.85rem; padding: 6px 12px;">
              ⚠️ Cảnh báo: ${res.low_stock_count} nguyên liệu sắp hết!
            </span>
          ` : '<span class="badge badge-success">Kho an toàn</span>'}
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Tên Nguyên Liệu</th><th>Tồn Kho</th><th>Ngưỡng Tối Thiểu</th><th>Trạng Thái</th><th>Nhập Thêm</th></tr>
            </thead>
            <tbody>
              ${items.map(it => `
                <tr style="${it.is_low_stock ? 'background-color: var(--color-danger-bg);' : ''}">
                  <td style="font-weight: 700;">${escapeHtml(it.name)}</td>
                  <td style="font-weight: 800; ${it.is_low_stock ? 'color: var(--color-danger);' : ''}">${it.quantity} ${escapeHtml(it.unit)}</td>
                  <td>${it.min_threshold} ${escapeHtml(it.unit)}</td>
                  <td>
                    ${it.is_low_stock ? '<span class="badge badge-danger">⚠️ Sắp hết</span>' : '<span class="badge badge-success">Đủ dùng</span>'}
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline btn-import-stock" data-id="${it.id}">➕ Nhập kho</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    body.querySelectorAll('.btn-import-stock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const amount = prompt('Nhập số lượng muốn nhập thêm vào kho:');
        if (amount && parseFloat(amount) > 0) {
          await api.post(`/inventory/import-export/${id}`, { change_amount: parseFloat(amount), action_type: 'import' });
          showToast('Đã nhập kho thành công!', 'success');
          loadInventoryTab(body);
        }
      });
    });
  } catch (err) {
    body.innerHTML = `<div style="color: red;">Lỗi tải kho: ${escapeHtml(err.message)}</div>`;
  }
}

// ----------------- TAB 5: NHÂN VIÊN & PHÂN QUYỀN (Mục 17) -----------------
async function loadStaffTab(body) {
  try {
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('vnm_user') || localStorage.getItem('vinhaminh_user') || '{}');
    } catch (_) {}
    const isAdmin = currentUser && currentUser.role === 'admin';

    const [resStaff, resCust] = await Promise.all([
      api.get('/staff-manager/staff'),
      api.get('/staff-manager/customers')
    ]);

    const staffList = resStaff.data || [];
    const custList = resCust.data || [];

    body.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
          <h4 style="font-size: 1.1rem; margin: 0;">Danh Sách Nhân Viên (${staffList.length})</h4>
          ${isAdmin ? `
            <button id="btn-open-add-staff" class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
              <span>➕</span> Thêm nhân viên
            </button>
          ` : ''}
        </div>

        <!-- Form Thêm Nhân Viên Mới (chỉ Admin) -->
        <div id="staff-form-container" style="display: none; background: var(--color-surface); border: 2px solid var(--color-primary-light); padding: var(--space-5); border-radius: var(--radius-lg); margin-bottom: var(--space-5); box-shadow: var(--shadow-md);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-2);">
            <h5 style="font-size: 1rem; font-weight: 800; color: var(--color-primary); margin: 0;">
              ➕ Thêm Tài Khoản Nhân Viên Mới
            </h5>
            <button type="button" id="btn-close-staff-form" class="btn-icon" title="Đóng" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px;">&times;</button>
          </div>

          <form id="form-add-staff">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4);">
              <div class="form-group">
                <label class="form-label" for="staff-f-name">Họ và tên (*):</label>
                <input type="text" id="staff-f-name" class="input" placeholder="Ví dụ: Nguyễn Văn Phúc" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="staff-f-email">Email đăng nhập (*):</label>
                <input type="email" id="staff-f-email" class="input" placeholder="Ví dụ: phuc.nv@vinhaminh.vn" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="staff-f-password">Mật khẩu (*):</label>
                <div style="position: relative;">
                  <input type="password" id="staff-f-password" class="input" placeholder="Tối thiểu 6 ký tự" minlength="6" required style="padding-right: 42px;" />
                  <button type="button" id="btn-toggle-staff-pw" class="btn-icon" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; min-width: 34px; min-height: 34px; background: transparent; border: none; cursor: pointer;" title="Hiện/ẩn mật khẩu">👁️</button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="staff-f-role">Vai trò:</label>
                <select id="staff-f-role" class="select" disabled style="background-color: var(--color-surface-alt); cursor: not-allowed; font-weight: 600;">
                  <option value="staff" selected>STAFF (Nhân viên phục vụ / Thu ngân)</option>
                </select>
                <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px;">Mặc định vai trò STAFF. Không tạo thêm ADMIN từ giao diện.</div>
              </div>
            </div>

            <div class="flex gap-2 justify-end" style="margin-top: var(--space-4);">
              <button type="button" id="btn-cancel-staff" class="btn btn-secondary btn-sm">Hủy</button>
              <button type="submit" id="btn-submit-staff" class="btn btn-primary btn-sm" style="font-weight: 700;">💾 Lưu Tài Khoản</button>
            </div>
          </form>
        </div>

        <div class="table-responsive" style="margin-bottom: var(--space-6);">
          <table class="admin-table">
            <thead>
              <tr><th>Họ Tên</th><th>Email</th><th>Vai Trò</th>${isAdmin ? '<th>Khóa / Mở</th>' : ''}</tr>
            </thead>
            <tbody>
              ${staffList.map(u => {
                const isSelf = currentUser && String(currentUser.id) === String(u.id);
                return `
                  <tr>
                    <td style="font-weight: 700;">${escapeHtml(u.name)} ${isSelf ? '<span class="badge badge-amber" style="font-size: 0.65rem;">(Bạn)</span>' : ''}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>
                      <span class="badge ${u.role === 'admin' ? 'badge-danger' : 'badge-amber'}">${escapeHtml(u.role)}</span>
                    </td>
                    ${isAdmin ? `
                      <td>
                        <button
                          class="btn btn-sm ${u.is_locked ? 'btn-success' : 'btn-danger'} btn-toggle-lock"
                          data-id="${u.id}"
                          data-role="${escapeHtml(u.role)}"
                          data-name="${escapeHtml(u.name)}"
                          data-locked="${u.is_locked ? '1' : '0'}"
                          ${isSelf ? 'disabled title="Quản trị viên không thể tự khóa chính mình" style="opacity: 0.5; cursor: not-allowed;"' : ''}
                        >
                          ${u.is_locked ? 'Mở khóa' : 'Khóa'}
                        </button>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <h4 style="font-size: 1.1rem; margin-bottom: var(--space-3);">Khách Hàng &amp; Tổng Chi Tiêu (${custList.length})</h4>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Họ Tên</th>
                <th>Email / SĐT</th>
                <th>Điểm Tích Lũy</th>
                <th>Tổng Chi Tiêu</th>
                ${isAdmin ? '<th>Khóa / Mở</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${custList.map(c => `
                <tr>
                  <td style="font-weight: 700;">
                    ${escapeHtml(c.name)}
                    ${c.is_locked ? '<span class="badge badge-danger" style="font-size: 0.65rem; margin-left: 4px;">Đã khóa</span>' : ''}
                  </td>
                  <td>${escapeHtml(c.email)} / ${escapeHtml(c.phone || '-')}</td>
                  <td>⭐ ${c.loyalty_points} điểm</td>
                  <td style="font-weight: 700; color: var(--color-primary);">${formatCurrency(c.total_spent)}</td>
                  ${isAdmin ? `
                    <td>
                      <button
                        class="btn btn-sm ${c.is_locked ? 'btn-success' : 'btn-danger'} btn-toggle-lock"
                        data-id="${c.id}"
                        data-role="customer"
                        data-name="${escapeHtml(c.name)}"
                        data-locked="${c.is_locked ? '1' : '0'}"
                      >
                        ${c.is_locked ? 'Mở khóa' : 'Khóa'}
                      </button>
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Gắn sự kiện mở/đóng form thêm nhân viên
    if (isAdmin) {
      const openAddBtn = body.querySelector('#btn-open-add-staff');
      const formContainer = body.querySelector('#staff-form-container');
      const closeFormBtn = body.querySelector('#btn-close-staff-form');
      const cancelFormBtn = body.querySelector('#btn-cancel-staff');
      const togglePwBtn = body.querySelector('#btn-toggle-staff-pw');
      const pwInput = body.querySelector('#staff-f-password');
      const staffForm = body.querySelector('#form-add-staff');

      if (openAddBtn && formContainer) {
        openAddBtn.addEventListener('click', () => {
          formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
          if (formContainer.style.display === 'block') {
            body.querySelector('#staff-f-name')?.focus();
          }
        });
      }

      const hideForm = () => {
        if (formContainer) formContainer.style.display = 'none';
      };

      if (closeFormBtn) closeFormBtn.addEventListener('click', hideForm);
      if (cancelFormBtn) cancelFormBtn.addEventListener('click', hideForm);

      if (togglePwBtn && pwInput) {
        togglePwBtn.addEventListener('click', () => {
          if (pwInput.type === 'password') {
            pwInput.type = 'text';
            togglePwBtn.textContent = '🙈';
          } else {
            pwInput.type = 'password';
            togglePwBtn.textContent = '👁️';
          }
        });
      }

      if (staffForm) {
        staffForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = body.querySelector('#staff-f-name').value.trim();
          const email = body.querySelector('#staff-f-email').value.trim();
          const password = pwInput.value;

          if (!name) {
            showToast('Vui lòng nhập họ tên nhân viên.', 'error');
            return;
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            showToast('Email không đúng định dạng.', 'error');
            return;
          }

          if (!password || password.length < 6) {
            showToast('Mật khẩu phải có tối thiểu 6 ký tự.', 'error');
            return;
          }

          try {
            const submitBtn = body.querySelector('#btn-submit-staff');
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.textContent = 'Đang lưu...';
            }

            const res = await api.post('/staff-manager/staff', {
              name,
              email,
              password,
              role: 'staff'
            });

            showToast(res.message || 'Đã tạo nhân viên mới thành công!', 'success');
            hideForm();
            loadStaffTab(body);
          } catch (err) {
            showToast(err.message || 'Không thể tạo nhân viên.', 'error');
          } finally {
            const submitBtn = body.querySelector('#btn-submit-staff');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = '💾 Lưu Tài Khoản';
            }
          }
        });
      }
    }

    // Gắn sự kiện khóa / mở khóa có hộp thoại xác nhận
    body.querySelectorAll('.btn-toggle-lock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const isLocked = btn.getAttribute('data-locked') === '1';
        const name = btn.getAttribute('data-name') || 'người dùng';
        const role = btn.getAttribute('data-role');
        const roleText = role === 'customer' ? 'khách hàng' : 'nhân viên';

        const actionText = isLocked ? 'MỞ KHÓA' : 'KHÓA';
        const confirmMsg = isLocked
          ? `Bạn có chắc chắn muốn MỞ KHÓA cho tài khoản ${roleText} "${name}" không?`
          : `Bạn có chắc chắn muốn KHÓA tài khoản ${roleText} "${name}" không? Người dùng bị khóa sẽ không thể đăng nhập vào hệ thống.`;

        if (!window.confirm(confirmMsg)) return;

        try {
          btn.disabled = true;
          const res = await api.patch(`/staff-manager/lock/${id}`, {});
          showToast(res.message || `Đã ${actionText.toLowerCase()} tài khoản thành công!`, 'success');
          loadStaffTab(body);
        } catch (err) {
          showToast(err.message || 'Thao tác thất bại.', 'error');
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    body.innerHTML = `<div style="color: red; padding: 1rem;">Lỗi tải dữ liệu người dùng: ${escapeHtml(err.message)}</div>`;
  }
}

// ----------------- TAB 6: KIỂM DUYỆT ĐÁNH GIÁ (Mục 13) -----------------
async function loadReviewsTab(body) {
  try {
    const res = await api.get('/reviews/admin/all');
    const reviews = res.data || [];

    body.innerHTML = `
      <div>
        <h4 style="font-size: 1.1rem; margin-bottom: var(--space-3);">Kiểm Duyệt Đánh Giá Khách Hàng (${reviews.length})</h4>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Món Ăn</th><th>Khách Hàng</th><th>Số Sao</th><th>Nhận Xét</th><th>Hiển Thị</th></tr>
            </thead>
            <tbody>
              ${reviews.map(r => `
                <tr>
                  <td style="font-weight: 700;">${escapeHtml(r.dish_name || 'Món')}</td>
                  <td>${escapeHtml(r.customer_name)}</td>
                  <td style="color: #fbbf24;">${'⭐'.repeat(r.rating)}</td>
                  <td>"${escapeHtml(r.comment)}"</td>
                  <td>
                    <button class="btn btn-sm ${r.is_approved ? 'badge-success' : 'badge-danger'} btn-toggle-review" data-id="${r.id}" style="border: none; cursor: pointer;">
                      ${r.is_approved ? '● Đang hiện' : '○ Đang ẩn'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    body.querySelectorAll('.btn-toggle-review').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await api.patch(`/reviews/admin/${id}/toggle`, {});
        loadReviewsTab(body);
      });
    });
  } catch (err) {
    body.innerHTML = `<div style="color: red;">Lỗi tải đánh giá: ${escapeHtml(err.message)}</div>`;
  }
}
