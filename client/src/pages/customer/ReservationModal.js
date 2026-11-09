/**
 * RESERVATION MODAL (Mục 11: Đặt bàn & Đặt tiệc trực tuyến)
 * Áp dụng skills: frontend-developer, ui-ux-designer
 */

import { api } from '../../services/api.js';
import { authService } from '../../services/auth.js';
import { showToast } from '../../components/Toast.js';
import { isValidName, isValidPhone, bindNameInput, bindPhoneInput } from '../../utils/validators.js';
import { escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { 
  validateReservationTime, 
  PARTY_TYPES_CONFIG, 
  RESERVATION_HOURS_CONFIG 
} from '../../../../shared/validators.js';

let resModalEl = null;
let currentSelectedTable = null;

export function openReservationModal(tableData = null) {
  if (tableData) {
    currentSelectedTable = tableData;
  }

  if (!resModalEl) {
    resModalEl = document.createElement('div');
    resModalEl.className = 'modal-backdrop';
    document.body.appendChild(resModalEl);

    resModalEl.addEventListener('click', (e) => {
      if (e.target === resModalEl) closeReservationModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && resModalEl.classList.contains('active')) {
        closeReservationModal();
      }
    });
  }

  renderReservationUI();
  if (!resModalEl.classList.contains('active')) {
    resModalEl.classList.add('active');
    lockScroll();
  }
}

export function closeReservationModal() {
  if (resModalEl && resModalEl.classList.contains('active')) {
    resModalEl.classList.remove('active');
    unlockScroll();
  }
}

function getLocalMinDateTime() {
  // Đặt trước ít nhất 1 giờ
  const minDate = new Date(Date.now() + 60 * 60 * 1000);
  let hours = minDate.getHours();
  let mins = minDate.getMinutes();

  if (hours < 9) {
    hours = 9;
    mins = 0;
  } else if (hours > 21) {
    // Nếu muộn hơn 21:00 hôm nay, chuyển sang 09:00 ngày mai
    minDate.setDate(minDate.getDate() + 1);
    hours = 9;
    mins = 0;
  }

  const yyyy = minDate.getFullYear();
  const mm = String(minDate.getMonth() + 1).padStart(2, '0');
  const dd = String(minDate.getDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mi = String(mins).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function getLocalMaxDateTime() {
  // Đặt trước tối đa 30 ngày
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const yyyy = maxDate.getFullYear();
  const mm = String(maxDate.getMonth() + 1).padStart(2, '0');
  const dd = String(maxDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T21:00`;
}

function renderReservationUI() {
  const user = authService.getCurrentUser();
  const minDateTime = getLocalMinDateTime();
  const maxDateTime = getLocalMaxDateTime();

  resModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 580px;">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.4rem;">📅</span>
          <div>
            <h3 style="font-size: 1.25rem;">Đặt Bàn & Đặt Tiệc Trước</h3>
            <p style="font-size: 0.85rem; margin: 0;">Giữ chỗ chu đáo, nhận ưu đãi đặc biệt từ nhà hàng</p>
          </div>
        </div>
        <button id="btn-close-reservation" class="btn-icon" title="Đóng">&times;</button>
      </div>

      <div class="modal-body" style="padding: var(--space-6);">
        ${currentSelectedTable ? `
          <div style="background: rgba(214, 163, 74, 0.15); border: 1.5px solid rgba(214, 163, 74, 0.45); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <span style="font-weight: 700; color: var(--color-primary);">🎯 Đang đặt qua mã QR:</span> Bàn <strong>${escapeHtml(currentSelectedTable.table_number)}</strong> (${escapeHtml(currentSelectedTable.area || 'Tầng 1')})
              <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 2px;">
                Sức chứa tối đa: ${currentSelectedTable.capacity || 4} khách. Điền form xong bàn sẽ tự động chuyển sang trạng thái <strong>ĐÃ ĐẶT</strong>.
              </div>
            </div>
            <button type="button" id="btn-cancel-table-bind" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 2px 8px; flex-shrink: 0;">Đổi bàn</button>
          </div>
        ` : `
          <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-2);">
            <button type="button" id="btn-scan-qr-prompt" class="btn btn-sm btn-outline" style="font-size: 0.76rem; border-radius: var(--radius-full); padding: 3px 10px;">
              📱 Quét / Nhập mã QR bàn
            </button>
          </div>
        `}
        <form id="form-reservation">
          <div class="grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="res-name">Họ và tên (*):</label>
              <input type="text" id="res-name" class="input" value="${user ? escapeHtml(user.name) : ''}" required placeholder="Nguyễn Văn A" autocomplete="name" maxlength="50" />
              <span class="error-text" id="err-res-name" style="display: none;"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="res-phone">Số điện thoại (*):</label>
              <input type="tel" id="res-phone" class="input" value="${user ? escapeHtml(user.phone || '') : ''}" required placeholder="0901234567" inputmode="tel" autocomplete="tel" maxlength="12" />
              <span class="error-text" id="err-res-phone" style="display: none;"></span>
            </div>
          </div>

          <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: calc(-1 * var(--space-2)); margin-bottom: var(--space-3); line-height: 1.4;">
            Thông tin được dùng để giữ bàn và liên hệ xác nhận theo <a href="/chinh-sach-bao-mat.html#privacy" target="_blank" rel="noopener" style="color: var(--color-primary); text-decoration: underline;">Chính sách bảo mật</a>.
          </p>

          <div class="grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="res-guests">Số lượng khách (*):</label>
              <input type="number" id="res-guests" class="input" value="4" min="1" max="50" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="res-datetime">Ngày & Giờ dùng bữa (*):</label>
              <input type="datetime-local" id="res-datetime" class="input" min="${minDateTime}" max="${maxDateTime}" required />
              <span class="error-text" id="err-res-datetime" style="display: none;"></span>
            </div>
          </div>

          <div class="grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="res-area">Khu vực ưa thích:</label>
              <select id="res-area" class="select">
                <option value="Tầng 1">Tầng 1 (Ấm cúng, gần quầy)</option>
                <option value="Tầng 2 (VIP)">Tầng 2 (VIP riêng tư, sang trọng)</option>
                <option value="Sân vườn ngoài trời">Sân vườn (Thoáng mát ngoài trời)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="res-party-type">Loại tiệc &amp; Thời lượng (*):</label>
              <select id="res-party-type" class="select">
                <option value="normal">Ăn uống thông thường (2 giờ)</option>
                <option value="family">Tiệc gia đình sum vầy (2.5 giờ)</option>
                <option value="birthday">🎉 Tiệc sinh nhật (3 giờ)</option>
                <option value="corporate">💼 Tiếp khách công ty / Họp mặt (3 giờ)</option>
                <option value="wedding">💍 Kỷ niệm ngày đặc biệt (4 giờ)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="res-special-request">Yêu cầu đặc biệt (tùy chọn):</label>
            <textarea id="res-special-request" class="textarea" rows="2" placeholder="Ví dụ: Trang trí hoa tươi, ghế cho em bé, vị trí gần cửa sổ..."></textarea>
          </div>

          <button type="submit" id="btn-submit-res" class="btn btn-primary btn-lg" style="width: 100%;">
            🔔 Gửi Yêu Cầu Đặt Chỗ
          </button>
        </form>
      </div>
    </div>
  `;

  attachReservationEvents();
}

function showFieldError(elementId, inputEl, message) {
  const errEl = resModalEl.querySelector(`#${elementId}`);
  if (errEl) {
    errEl.textContent = `⚠️ ${message}`;
    errEl.style.display = 'block';
  }
  if (inputEl) {
    inputEl.classList.add('input-error');
  }
}

function hideFieldError(elementId, inputEl) {
  const errEl = resModalEl.querySelector(`#${elementId}`);
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
  if (inputEl) {
    inputEl.classList.remove('input-error');
  }
}

function attachReservationEvents() {
  const closeBtn = resModalEl.querySelector('#btn-close-reservation');
  if (closeBtn) closeBtn.addEventListener('click', closeReservationModal);

  const nameInput = resModalEl.querySelector('#res-name');
  const phoneInput = resModalEl.querySelector('#res-phone');

  bindNameInput(nameInput);
  bindPhoneInput(phoneInput);

  nameInput?.addEventListener('input', () => hideFieldError('err-res-name', nameInput));
  phoneInput?.addEventListener('input', () => hideFieldError('err-res-phone', phoneInput));

  nameInput?.addEventListener('blur', () => {
    const val = nameInput.value.trim();
    if (val && !isValidName(val)) {
      showFieldError('err-res-name', nameInput, 'Họ tên chỉ gồm chữ cái, không chứa số.');
    }
  });

  phoneInput?.addEventListener('blur', () => {
    const val = phoneInput.value.trim();
    if (val && !isValidPhone(val, false)) {
      showFieldError('err-res-phone', phoneInput, 'Số điện thoại không hợp lệ (ví dụ 0901234567).');
    }
  });

  const btnCancelBind = resModalEl.querySelector('#btn-cancel-table-bind');
  if (btnCancelBind) {
    btnCancelBind.addEventListener('click', () => {
      currentSelectedTable = null;
      renderReservationUI();
    });
  }

  const btnScanPrompt = resModalEl.querySelector('#btn-scan-qr-prompt');
  if (btnScanPrompt) {
    btnScanPrompt.addEventListener('click', async () => {
      const code = prompt('Nhập mã token bàn (hoặc mã QR trên bàn, ví dụ: table_qr_1):');
      if (!code) return;
      try {
        const res = await api.get('/tables/by-token/' + encodeURIComponent(code.trim()));
        if (res && res.data) {
          currentSelectedTable = res.data;
          showToast(`Đã nhận diện Bàn số ${res.data.table_number} (${res.data.area})!`, 'success');
          renderReservationUI();
        }
      } catch (err) {
        showToast(err.message || 'Mã bàn không hợp lệ.', 'error');
      }
    });
  }

  const form = resModalEl.querySelector('#form-reservation');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = resModalEl.querySelector('#btn-submit-res');

      const nameVal = nameInput.value.trim();
      const phoneVal = phoneInput.value.trim();
      const datetimeInput = resModalEl.querySelector('#res-datetime');
      const datetimeVal = datetimeInput ? datetimeInput.value : '';

      let firstErr = null;
      if (!isValidName(nameVal)) {
        showFieldError('err-res-name', nameInput, 'Họ tên chỉ gồm chữ cái, không chứa số.');
        if (!firstErr) firstErr = nameInput;
      }
      if (!isValidPhone(phoneVal, false)) {
        showFieldError('err-res-phone', phoneInput, 'Số điện thoại không hợp lệ (ví dụ 0901234567).');
        if (!firstErr) firstErr = phoneInput;
      }

      const timeVal = validateReservationTime(datetimeVal);
      if (!timeVal.isValid) {
        showFieldError('err-res-datetime', datetimeInput, timeVal.message);
        if (!firstErr) firstErr = datetimeInput;
      } else {
        hideFieldError('err-res-datetime', datetimeInput);
      }

      if (firstErr) {
        firstErr.focus();
        return;
      }

      const payload = {
        customer_name: nameVal,
        customer_phone: phoneVal,
        guest_count: parseInt(resModalEl.querySelector('#res-guests').value, 10),
        reservation_time: resModalEl.querySelector('#res-datetime').value,
        area: currentSelectedTable ? (currentSelectedTable.area || 'Tầng 1') : resModalEl.querySelector('#res-area').value,
        party_type: resModalEl.querySelector('#res-party-type').value,
        special_request: resModalEl.querySelector('#res-special-request').value.trim(),
        table_id: currentSelectedTable ? currentSelectedTable.id : null
      };

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang ghi nhận giữ chỗ...';
        const res = await api.post('/reservations', payload);
        showToast(res.message, 'success', 5000);
        window.dispatchEvent(new CustomEvent('reservation:created', { detail: payload }));
        currentSelectedTable = null;
        closeReservationModal();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🔔 Gửi Yêu Cầu Đặt Chỗ';
      }
    });
  }
}
