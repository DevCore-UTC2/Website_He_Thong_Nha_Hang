/**
 * AUTH MODAL COMPONENT — VỊ NHÀ MÌNH
 * Mục 1: Đăng ký / đăng nhập và phân quyền
 * Sửa lỗi L1:
 * - Backdrop click KHÔNG đóng modal để tránh mất dữ liệu đã nhập.
 * - Chỉ đóng modal khi bấm nút Đóng (X) hoặc phím Escape.
 * - Giữ nguyên DOM, chuyển tab bằng ẩn/hiện form, không ghi đè innerHTML.
 * - Tự động lưu bản nháp (draft) vào sessionStorage (trừ mật khẩu).
 * - Focus trap chuẩn a11y (role="dialog", aria-modal="true").
 * - Bộ chọn mã quốc gia (15 quốc gia) cho số điện thoại.
 * - Thanh đo độ mạnh mật khẩu 3 mức trực quan (Yếu / Trung bình / Mạnh).
 * - Checkbox đồng ý Điều khoản dịch vụ & Chính sách bảo mật (Luật An ninh mạng).
 */

import { authService } from '../services/auth.js';
import { 
  isValidEmail, 
  validatePassword, 
  isValidPhone, 
  isValidName, 
  bindNameInput, 
  bindPhoneInput,
  COUNTRY_CALLING_CODES,
  normalizePhoneE164,
  isValidPhoneE164
} from '../utils/validators.js';
import { showToast } from './Toast.js';
import { iconHtml } from './icons.js';
import { triggerShake, triggerBounce, triggerInputError } from '../utils/ui-feedback.js';

let authModalEl = null;
let currentTab = 'login'; // 'login' | 'register'
let lastFocusedElement = null;

const DRAFT_STORAGE_KEY = 'vnm_auth_form_draft';

export function openAuthModal(defaultTab = 'login') {
  lastFocusedElement = document.activeElement;
  currentTab = defaultTab;

  if (!authModalEl) {
    createAuthModalDOM();
  }

  // Chuyển tab hiển thị phù hợp
  switchTab(currentTab);

  // Phục hồi dữ liệu nháp nếu có
  restoreDraft();

  authModalEl.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus trap: focus vào ô input đầu tiên của tab hiện tại
  setTimeout(() => {
    const activeInput = currentTab === 'login' 
      ? authModalEl.querySelector('#login-email')
      : authModalEl.querySelector('#reg-name');
    if (activeInput) activeInput.focus();
  }, 50);
}

export function closeAuthModal() {
  if (authModalEl) {
    authModalEl.classList.remove('active');
  }
  document.body.style.overflow = '';

  // Trả lại focus cho nút đã mở modal
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

/** Tạo cấu trúc DOM modal một lần duy nhất */
function createAuthModalDOM() {
  authModalEl = document.createElement('div');
  authModalEl.className = 'modal-backdrop';
  authModalEl.setAttribute('role', 'dialog');
  authModalEl.setAttribute('aria-modal', 'true');
  authModalEl.setAttribute('aria-labelledby', 'auth-modal-title');

  authModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 460px; position: relative;">
      <!-- Nút Đóng (X) góc trên bên phải -->
      <button 
        id="btn-close-auth-modal" 
        class="btn-icon" 
        type="button"
        title="Đóng cửa sổ"
        aria-label="Đóng cửa sổ đăng nhập"
        style="position: absolute; right: 12px; top: 12px; z-index: 10; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; color: var(--color-text-muted); border-radius: var(--radius-full);"
      >
        ${iconHtml('close')}
      </button>

      <!-- Tiêu đề ẩn hỗ trợ trợ thính a11y -->
      <h2 id="auth-modal-title" class="sr-only" style="position: absolute; left: -9999px;">Đăng nhập hoặc Đăng ký tài khoản</h2>

      <!-- Tab Header Switcher -->
      <div style="display: flex; border-bottom: 1px solid var(--color-border); background-color: var(--color-surface-alt); border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); padding-right: 48px;">
        <button 
          id="tab-login" 
          type="button"
          class="btn flex-1" 
          style="padding: var(--space-4); border-radius: 0; font-weight: 700; transition: all var(--transition-fast);"
        >
          Đăng Nhập
        </button>
        <button 
          id="tab-register" 
          type="button"
          class="btn flex-1" 
          style="padding: var(--space-4); border-radius: 0; font-weight: 700; transition: all var(--transition-fast);"
        >
          Tạo Tài Khoản
        </button>
      </div>

      <div class="modal-body" style="padding: var(--space-6); max-height: calc(85vh - 60px); overflow-y: auto;">
        <!-- Form Đăng Nhập -->
        <form id="form-login" style="display: none;">
          <div class="form-group">
            <label class="form-label" for="login-email">Email hoặc Số điện thoại:</label>
            <input 
              type="text" 
              id="login-email" 
              class="input" 
              placeholder="admin@vinhaminh.vn hoặc 0901234567" 
              required 
              autocomplete="username"
            />
            <span class="error-text" id="err-login-email" style="display: none;"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Mật khẩu:</label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="login-password" 
                class="input" 
                placeholder="••••••••" 
                required 
                autocomplete="current-password"
                style="padding-right: 40px;"
              />
              <button 
                type="button" 
                class="btn-toggle-pwd" 
                data-target="login-password"
                style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); display: flex; align-items: center;"
                title="Hiện/Ẩn mật khẩu"
                aria-label="Hiện hoặc ẩn mật khẩu"
              >
                ${iconHtml('eye')}
              </button>
            </div>
            <span class="error-text" id="err-login-password" style="display: none;"></span>
          </div>

          <button type="submit" id="btn-submit-login" class="btn btn-primary btn-lg" style="width: 100%; margin-top: var(--space-2);">
            Đăng Nhập
          </button>
        </form>

        <!-- Form Đăng Ký -->
        <form id="form-register" style="display: none;">
          <div class="form-group">
            <label class="form-label" for="reg-name">Họ và tên:</label>
            <input type="text" id="reg-name" class="input" placeholder="Nguyễn Văn An" required autocomplete="name" maxlength="50" />
            <span class="error-text" id="err-reg-name" style="display: none;"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Email:</label>
            <input type="email" id="reg-email" class="input" placeholder="example@gmail.com" required autocomplete="email" />
            <span class="error-text" id="err-reg-email" style="display: none;"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-phone">Số điện thoại (chuẩn E.164):</label>
            <div style="display: flex; gap: 0;">
              <select id="reg-dial-code" class="select" style="width: auto; max-width: 130px; border-top-right-radius: 0; border-bottom-right-radius: 0; padding: 0.6rem 0.5rem; font-size: 0.85rem;" aria-label="Mã vùng quốc gia">
                ${COUNTRY_CALLING_CODES.map(c => `
                  <option value="${c.dial}" ${c.code === 'VN' ? 'selected' : ''}>${c.code} (${c.dial})</option>
                `).join('')}
              </select>
              <input 
                type="tel" 
                id="reg-phone" 
                class="input" 
                placeholder="0901234567" 
                inputmode="tel" 
                autocomplete="tel" 
                maxlength="15" 
                style="border-top-left-radius: 0; border-bottom-left-radius: 0; flex: 1;" 
              />
            </div>
            <span class="error-text" id="err-reg-phone" style="display: none;"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password">Mật khẩu (≥ 8 ký tự, có chữ & số):</label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="reg-password" 
                class="input" 
                placeholder="Mật khẩu bảo mật" 
                required 
                autocomplete="new-password"
                style="padding-right: 40px;"
              />
              <button 
                type="button" 
                class="btn-toggle-pwd" 
                data-target="reg-password"
                style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); display: flex; align-items: center;"
                title="Hiện/Ẩn mật khẩu"
                aria-label="Hiện hoặc ẩn mật khẩu"
              >
                ${iconHtml('eye')}
              </button>
            </div>
            
            <!-- Thanh đo độ mạnh mật khẩu 3 mức -->
            <div id="pwd-strength-container" style="margin-top: 8px; display: none;">
              <div style="display: flex; gap: 4px; height: 5px; margin-bottom: 4px;">
                <div id="pwd-bar-1" style="flex: 1; height: 100%; border-radius: var(--radius-xs); background: var(--color-border); transition: background var(--transition-fast);"></div>
                <div id="pwd-bar-2" style="flex: 1; height: 100%; border-radius: var(--radius-xs); background: var(--color-border); transition: background var(--transition-fast);"></div>
                <div id="pwd-bar-3" style="flex: 1; height: 100%; border-radius: var(--radius-xs); background: var(--color-border); transition: background var(--transition-fast);"></div>
              </div>
              <div style="font-size: 0.78rem; color: var(--color-text-muted);">
                Độ mạnh mật khẩu: <span id="pwd-strength-text" style="font-weight: 700;">Chưa nhập</span>
              </div>
            </div>

            <span class="error-text" id="err-reg-password" style="display: none;"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-confirm-password">Xác nhận mật khẩu:</label>
            <input type="password" id="reg-confirm-password" class="input" placeholder="Nhập lại mật khẩu" required autocomplete="new-password" />
            <span class="error-text" id="err-reg-confirm" style="display: none;"></span>
          </div>

          <!-- Checkbox Điều khoản dịch vụ & Chính sách bảo mật (Luật An ninh mạng) -->
          <div class="form-group" style="margin-top: var(--space-4);">
            <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.82rem; cursor: pointer; line-height: 1.4; color: var(--color-text-muted);">
              <input type="checkbox" id="reg-consent" required style="margin-top: 2px; accent-color: var(--color-primary); width: 16px; height: 16px; flex-shrink: 0;" />
              <span>
                Tôi đồng ý với <button type="button" id="link-terms" style="color: var(--color-primary); text-decoration: underline; font-weight: 600; padding: 0; background: none; border: none; font-size: inherit; cursor: pointer;">Điều khoản dịch vụ</button> và <button type="button" id="link-privacy" style="color: var(--color-primary); text-decoration: underline; font-weight: 600; padding: 0; background: none; border: none; font-size: inherit; cursor: pointer;">Chính sách bảo mật</button> của Vị Nhà Mình.
              </span>
            </label>
            <span class="error-text" id="err-reg-consent" style="display: none;"></span>
          </div>

          <button type="submit" id="btn-submit-register" class="btn btn-primary btn-lg" style="width: 100%; margin-top: var(--space-2);">
            Đăng Ký Tài Khoản
          </button>
          <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: var(--space-2); text-align: center; line-height: 1.4;">
            Thông tin số điện thoại dùng để xác nhận đơn hàng và tích điểm thành viên. Chúng tôi không chia sẻ cho bên thứ ba.
          </p>
        </form>

        <!-- DEMO ONLY: xóa các nút đăng nhập nhanh này trước khi triển khai môi trường production -->
        <div style="margin-top: var(--space-6); padding: var(--space-3); background-color: var(--color-surface-alt); border-radius: var(--radius-md); text-align: center; border: 1px dashed var(--color-border);">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
            ${iconHtml('star')} Demo nhanh tiện lợi (1 Click)
          </span>
          <div class="flex gap-2 justify-center flex-wrap" style="margin-top: var(--space-2);">
            <button id="btn-quick-admin" class="btn btn-sm btn-outline" type="button" style="display: inline-flex; align-items: center; gap: 4px;">
              ${iconHtml('crown')} Quản trị
            </button>
            <button id="btn-quick-staff" class="btn btn-sm btn-primary" type="button" style="background-color: var(--color-secondary); display: inline-flex; align-items: center; gap: 4px;">
              ${iconHtml('kitchen')} Nhân viên
            </button>
            <button id="btn-quick-customer" class="btn btn-sm btn-secondary" type="button" style="display: inline-flex; align-items: center; gap: 4px;">
              ${iconHtml('user')} Khách hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(authModalEl);

  // SỬA LỖI L1 & T3.3: KHÔNG đóng modal khi click backdrop! Modal nảy nhẹ cảnh báo
  authModalEl.addEventListener('click', (e) => {
    if (e.target === authModalEl) {
      const box = authModalEl.querySelector('.modal-box');
      if (box) {
        triggerBounce(box);
      }
    }
  });

  // Nút Đóng (X)
  const closeBtn = authModalEl.querySelector('#btn-close-auth-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAuthModal);
  }

  // Đóng bằng phím Escape & Focus Trap
  document.addEventListener('keydown', handleKeyDown);

  attachAuthEvents();
}

/** Xử lý phím Escape và Focus Trap */
function handleKeyDown(e) {
  if (!authModalEl || !authModalEl.classList.contains('active')) return;

  if (e.key === 'Escape') {
    closeAuthModal();
    return;
  }

  // Focus trap khi ấn Tab
  if (e.key === 'Tab') {
    const focusableSelectors = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(authModalEl.querySelectorAll(focusableSelectors))
      .filter(el => el.offsetParent !== null); // Chỉ lấy phần tử đang hiển thị

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
}

/** Chuyển tab Đăng nhập / Đăng ký mà KHÔNG làm mất dữ liệu đã nhập */
function switchTab(tab) {
  currentTab = tab;
  const tabLogin = authModalEl.querySelector('#tab-login');
  const tabReg = authModalEl.querySelector('#tab-register');
  const formLogin = authModalEl.querySelector('#form-login');
  const formReg = authModalEl.querySelector('#form-register');

  if (tab === 'login') {
    tabLogin.style.borderBottom = '3px solid var(--color-primary)';
    tabLogin.style.color = 'var(--color-primary)';
    tabLogin.style.backgroundColor = 'var(--color-surface)';

    tabReg.style.borderBottom = 'none';
    tabReg.style.color = 'var(--color-text-muted)';
    tabReg.style.backgroundColor = 'transparent';

    formLogin.style.display = 'block';
    formReg.style.display = 'none';
  } else {
    tabReg.style.borderBottom = '3px solid var(--color-primary)';
    tabReg.style.color = 'var(--color-primary)';
    tabReg.style.backgroundColor = 'var(--color-surface)';

    tabLogin.style.borderBottom = 'none';
    tabLogin.style.color = 'var(--color-text-muted)';
    tabLogin.style.backgroundColor = 'transparent';

    formReg.style.display = 'block';
    formLogin.style.display = 'none';
  }

  saveDraft();
}

/** Lưu nháp dữ liệu form vào sessionStorage (trừ mật khẩu vì an toàn) */
function saveDraft() {
  if (!authModalEl) return;
  const draft = {
    tab: currentTab,
    loginEmail: authModalEl.querySelector('#login-email')?.value || '',
    regName: authModalEl.querySelector('#reg-name')?.value || '',
    regEmail: authModalEl.querySelector('#reg-email')?.value || '',
    regPhone: authModalEl.querySelector('#reg-phone')?.value || '',
    regDialCode: authModalEl.querySelector('#reg-dial-code')?.value || '+84',
    // Lưu ý: Không lưu regConsent vào nháp để đảm bảo người dùng phải tự tay đồng ý mỗi lần
  };
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (e) {
    // Không lưu được nếu storage bị chặn
  }
}

/** Phục hồi bản nháp */
function restoreDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);

    const loginEmail = authModalEl.querySelector('#login-email');
    const regName = authModalEl.querySelector('#reg-name');
    const regEmail = authModalEl.querySelector('#reg-email');
    const regPhone = authModalEl.querySelector('#reg-phone');
    const regDialCode = authModalEl.querySelector('#reg-dial-code');

    if (loginEmail && !loginEmail.value && draft.loginEmail) loginEmail.value = draft.loginEmail;
    if (regName && !regName.value && draft.regName) regName.value = draft.regName;
    if (regEmail && !regEmail.value && draft.regEmail) regEmail.value = draft.regEmail;
    if (regPhone && !regPhone.value && draft.regPhone) regPhone.value = draft.regPhone;
    if (regDialCode && draft.regDialCode) regDialCode.value = draft.regDialCode;
    // Không phục hồi regConsent từ nháp
  } catch (e) {
    // Bỏ qua lỗi parse
  }
}

/** Xóa bản nháp khi hoàn thành đăng nhập/đăng ký */
function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {}
}

function attachAuthEvents() {
  // Chuyển tab Đăng nhập / Đăng ký
  authModalEl.querySelector('#tab-login').addEventListener('click', () => switchTab('login'));
  authModalEl.querySelector('#tab-register').addEventListener('click', () => switchTab('register'));

  // Hiện / Ẩn mật khẩu
  authModalEl.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = authModalEl.querySelector(`#${targetId}`);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? iconHtml('eyeOff') : iconHtml('eye');
      }
    });
  });

  // Lưu nháp khi người dùng nhập liệu (không track checkbox consent)
  const inputsToTrack = ['#login-email', '#reg-name', '#reg-email', '#reg-phone', '#reg-dial-code'];
  inputsToTrack.forEach(sel => {
    authModalEl.querySelector(sel)?.addEventListener('input', saveDraft);
    authModalEl.querySelector(sel)?.addEventListener('change', saveDraft);
  });

  // Xử lý Form Đăng nhập
  const loginForm = authModalEl.querySelector('#form-login');
  if (loginForm) {
    const loginEmail = authModalEl.querySelector('#login-email');
    const loginPassword = authModalEl.querySelector('#login-password');

    loginEmail?.addEventListener('input', () => hideFieldError('err-login-email', loginEmail));
    loginPassword?.addEventListener('input', () => hideFieldError('err-login-password', loginPassword));

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = loginEmail.value.trim();
      const password = loginPassword.value;
      const submitBtn = authModalEl.querySelector('#btn-submit-login');

      if (!identifier) {
        showFieldError('err-login-email', loginEmail, 'Vui lòng nhập email hoặc số điện thoại.');
        triggerInputError(loginEmail);
        triggerShake(loginForm);
        loginEmail.focus();
        return;
      }

      if (!password) {
        showFieldError('err-login-password', loginPassword, 'Vui lòng nhập mật khẩu.');
        triggerInputError(loginPassword);
        triggerShake(loginForm);
        loginPassword.focus();
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xác thực...';
        await authService.login(identifier, password);
        clearDraft();
        showToast('Đăng nhập thành công! Chào mừng bạn.', 'success');
        closeAuthModal();
      } catch (err) {
        showToast(err.message, 'error');
        // Rung lắc form và input khi lỗi xác thực (T3.3)
        triggerShake(loginForm);
        triggerInputError(loginPassword);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng Nhập';
      }
    });
  }

  // Xử lý Form Đăng ký
  const regForm = authModalEl.querySelector('#form-register');
  if (regForm) {
    const regName = authModalEl.querySelector('#reg-name');
    const regEmail = authModalEl.querySelector('#reg-email');
    const regPhone = authModalEl.querySelector('#reg-phone');
    const regDialCode = authModalEl.querySelector('#reg-dial-code');
    const regPassword = authModalEl.querySelector('#reg-password');
    const regConfirm = authModalEl.querySelector('#reg-confirm-password');
    const regConsent = authModalEl.querySelector('#reg-consent');

    bindNameInput(regName);
    bindPhoneInput(regPhone);

    regName?.addEventListener('input', () => hideFieldError('err-reg-name', regName));
    regEmail?.addEventListener('input', () => hideFieldError('err-reg-email', regEmail));
    regPhone?.addEventListener('input', () => hideFieldError('err-reg-phone', regPhone));
    regConfirm?.addEventListener('input', () => hideFieldError('err-reg-confirm', regConfirm));
    regConsent?.addEventListener('change', () => hideFieldError('err-reg-consent', regConsent));

    // Đo độ mạnh mật khẩu realtime 3 mức
    const strengthContainer = authModalEl.querySelector('#pwd-strength-container');
    const bar1 = authModalEl.querySelector('#pwd-bar-1');
    const bar2 = authModalEl.querySelector('#pwd-bar-2');
    const bar3 = authModalEl.querySelector('#pwd-bar-3');
    const strengthText = authModalEl.querySelector('#pwd-strength-text');

    regPassword?.addEventListener('input', () => {
      hideFieldError('err-reg-password', regPassword);
      const val = regPassword.value;
      if (!val) {
        strengthContainer.style.display = 'none';
        return;
      }

      strengthContainer.style.display = 'block';
      const check = validatePassword(val);

      if (check.score === 1) {
        bar1.style.background = 'var(--color-danger)';
        bar2.style.background = 'var(--color-border)';
        bar3.style.background = 'var(--color-border)';
        strengthText.textContent = 'Yếu';
        strengthText.style.color = 'var(--color-danger)';
      } else if (check.score === 2) {
        bar1.style.background = 'var(--color-warning)';
        bar2.style.background = 'var(--color-warning)';
        bar3.style.background = 'var(--color-border)';
        strengthText.textContent = 'Trung bình';
        strengthText.style.color = 'var(--color-warning)';
      } else if (check.score === 3) {
        bar1.style.background = 'var(--color-success)';
        bar2.style.background = 'var(--color-success)';
        bar3.style.background = 'var(--color-success)';
        strengthText.textContent = 'Mạnh';
        strengthText.style.color = 'var(--color-success)';
      } else {
        bar1.style.background = 'var(--color-border)';
        bar2.style.background = 'var(--color-border)';
        bar3.style.background = 'var(--color-border)';
        strengthText.textContent = 'Quá ngắn';
        strengthText.style.color = 'var(--color-text-muted)';
      }
    });

    // Kiểm tra số điện thoại realtime khi blur
    regPhone?.addEventListener('blur', async () => {
      const val = regPhone.value.trim();
      const dial = regDialCode.value;
      if (val) {
        const e164 = normalizePhoneE164(val, dial);
        if (!e164 || !isValidPhoneE164(e164)) {
          showFieldError('err-reg-phone', regPhone, 'Số điện thoại không hợp lệ.');
        } else {
          try {
            const check = await authService.checkPhone(val, dial);
            if (check.exists) {
              showFieldError('err-reg-phone', regPhone, 'Số điện thoại này đã được sử dụng.');
            }
          } catch (e) {
            // Lỗi mạng hoặc server tạm thời
          }
        }
      }
    });

    // Mở trang Điều khoản dịch vụ & Chính sách bảo mật
    authModalEl.querySelector('#link-terms')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('/chinh-sach-bao-mat.html#terms', '_blank');
    });

    authModalEl.querySelector('#link-privacy')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('/chinh-sach-bao-mat.html#privacy', '_blank');
    });

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = regName.value.trim();
      const email = regEmail.value.trim();
      const phone = regPhone.value.trim();
      const dialCode = regDialCode.value;
      const password = regPassword.value;
      const confirm = regConfirm.value;
      const consent = regConsent.checked;
      const submitBtn = authModalEl.querySelector('#btn-submit-register');

      let firstErrInput = null;

      if (!isValidName(name)) {
        showFieldError('err-reg-name', regName, 'Họ tên chỉ gồm chữ cái, không chứa số.');
        if (!firstErrInput) firstErrInput = regName;
      }

      if (!isValidEmail(email)) {
        showFieldError('err-reg-email', regEmail, 'Email không đúng định dạng.');
        if (!firstErrInput) firstErrInput = regEmail;
      }

      if (phone) {
        const e164 = normalizePhoneE164(phone, dialCode);
        if (!e164 || !isValidPhoneE164(e164)) {
          showFieldError('err-reg-phone', regPhone, 'Số điện thoại không hợp lệ.');
          if (!firstErrInput) firstErrInput = regPhone;
        }
      }

      const passCheck = validatePassword(password);
      if (!passCheck.isValid) {
        showFieldError('err-reg-password', regPassword, passCheck.message);
        if (!firstErrInput) firstErrInput = regPassword;
      }

      if (password !== confirm) {
        showFieldError('err-reg-confirm', regConfirm, 'Mật khẩu xác nhận không khớp.');
        if (!firstErrInput) firstErrInput = regConfirm;
      }

      if (!consent) {
        showFieldError('err-reg-consent', regConsent, 'Bạn cần đồng ý với Điều khoản và Chính sách bảo mật.');
        if (!firstErrInput) firstErrInput = regConsent;
      }

      if (firstErrInput) {
        triggerShake(regForm);
        firstErrInput.focus();
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang khởi tạo tài khoản...';
        await authService.register(name, email, password, phone, dialCode, consent);
        clearDraft();
        showToast('Tạo tài khoản thành công! Bạn đã được tự động đăng nhập.', 'success');
        closeAuthModal();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng Ký Tài Khoản';
      }
    });
  }

  // DEMO ONLY: xóa các nút đăng nhập nhanh này trước khi triển khai môi trường production
  // Các nút Demo 1-click
  const quickAdmin = authModalEl.querySelector('#btn-quick-admin');
  if (quickAdmin) {
    quickAdmin.addEventListener('click', async () => {
      try {
        await authService.login('admin@vinhaminh.vn', 'Admin@1234');
        clearDraft();
        showToast('Đã đăng nhập với tư cách Quản Trị Viên (Admin)!', 'success');
        closeAuthModal();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  const quickStaff = authModalEl.querySelector('#btn-quick-staff');
  if (quickStaff) {
    quickStaff.addEventListener('click', async () => {
      try {
        await authService.login('staff@vinhaminh.vn', 'Staff@1234');
        clearDraft();
        showToast('Đã đăng nhập với tư cách Nhân Viên (Staff)!', 'success');
        closeAuthModal();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  const quickCust = authModalEl.querySelector('#btn-quick-customer');
  if (quickCust) {
    quickCust.addEventListener('click', async () => {
      try {
        await authService.login('khach@gmail.com', 'Khach@1234');
        clearDraft();
        showToast('Đã đăng nhập với tư cách Khách Hàng!', 'success');
        closeAuthModal();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function showFieldError(elementId, inputEl, message) {
  const errEl = authModalEl.querySelector(`#${elementId}`);
  if (errEl) {
    errEl.textContent = `⚠️ ${message}`;
    errEl.style.display = 'block';
  }
  if (inputEl) {
    inputEl.classList.add('input-error');
    triggerInputError(inputEl);
  }
}

function hideFieldError(elementId, inputEl) {
  const errEl = authModalEl.querySelector(`#${elementId}`);
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
  if (inputEl) {
    inputEl.classList.remove('input-error');
    inputEl.classList.remove('ui-input-error');
  }
}
