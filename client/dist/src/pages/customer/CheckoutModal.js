/**
 * CHECKOUT & VOUCHER MODAL (Mục 6: Voucher & Mục 7: Thanh toán và tạo đơn)
 * Áp dụng skills: backend-development-feature-development, ui-ux-designer, billing-automation
 */

import { api } from '../../services/api.js';
import { cartService } from '../../services/cart.js';
import { authService } from '../../services/auth.js';
import { formatCurrency, escapeHtml, lockScroll, unlockScroll } from '../../utils/format.js';
import { showToast } from '../../components/Toast.js';
import { openOrderTrackingModal } from './OrderTrackingModal.js';
import { closeCartDrawer } from './CartDrawer.js';
import { isValidName, isValidPhone, isValidTaxId, isValidEmail, bindNameInput, bindPhoneInput } from '../../utils/validators.js';
import { isOrderingAllowed, getOrderingMessage, fetchStoreStatus } from '../../services/storeService.js';

let checkoutModalEl = null;
let appliedVoucher = null;
let availableVouchers = [];

export function openCheckoutModal() {
  const items = cartService.getItems();
  if (items.length === 0) {
    showToast('Giỏ hàng của bạn đang trống!', 'warning');
    return;
  }

  if (!isOrderingAllowed()) {
    showToast(getOrderingMessage() || 'Nhà hàng hiện đang đóng cửa nhận đơn!', 'warning', 5000);
    return;
  }

  if (!checkoutModalEl) {
    checkoutModalEl = document.createElement('div');
    checkoutModalEl.className = 'modal-backdrop';
    document.body.appendChild(checkoutModalEl);

    checkoutModalEl.addEventListener('click', (e) => {
      if (e.target === checkoutModalEl) closeCheckoutModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && checkoutModalEl.classList.contains('active')) {
        closeCheckoutModal();
      }
    });
  }

  appliedVoucher = null;
  loadVouchers().then(() => {
    renderCheckoutContent();
    if (!checkoutModalEl.classList.contains('active')) {
      checkoutModalEl.classList.add('active');
      lockScroll();
    }
  });
}

export function closeCheckoutModal() {
  if (checkoutModalEl && checkoutModalEl.classList.contains('active')) {
    checkoutModalEl.classList.remove('active');
    unlockScroll();
  }
}

async function loadVouchers() {
  try {
    const res = await api.get('/vouchers');
    availableVouchers = res.data || [];
  } catch {
    availableVouchers = [];
  }
}

function captureFormState() {
  if (!checkoutModalEl) return null;
  const nameInput = checkoutModalEl.querySelector('#checkout-name');
  const phoneInput = checkoutModalEl.querySelector('#checkout-phone');
  const addressInput = checkoutModalEl.querySelector('#checkout-address');
  const tableSelect = checkoutModalEl.querySelector('#checkout-table-id');
  const typeRadio = checkoutModalEl.querySelector('input[name="order_type"]:checked');
  const payRadio = checkoutModalEl.querySelector('input[name="payment_method"]:checked');
  const chkInvoice = checkoutModalEl.querySelector('#chk-request-invoice');
  const compNameInput = checkoutModalEl.querySelector('#invoice-company-name');
  const taxIdInput = checkoutModalEl.querySelector('#invoice-tax-id');
  const compAddressInput = checkoutModalEl.querySelector('#invoice-company-address');
  const compEmailInput = checkoutModalEl.querySelector('#invoice-company-email');

  return {
    name: nameInput ? nameInput.value : '',
    phone: phoneInput ? phoneInput.value : '',
    address: addressInput ? addressInput.value : '',
    tableId: tableSelect ? tableSelect.value : '',
    orderType: typeRadio ? typeRadio.value : 'dine_in',
    paymentMethod: payRadio ? payRadio.value : 'cash',
    requestInvoice: chkInvoice ? chkInvoice.checked : false,
    invoiceCompanyName: compNameInput ? compNameInput.value : '',
    invoiceTaxId: taxIdInput ? taxIdInput.value : '',
    invoiceCompanyAddress: compAddressInput ? compAddressInput.value : '',
    invoiceCompanyEmail: compEmailInput ? compEmailInput.value : ''
  };
}

function renderCheckoutContent(savedState = null) {
  const user = authService.getCurrentUser();
  const items = cartService.getItems();
  const subtotal = cartService.getSubtotal();
  const discountAmount = appliedVoucher ? appliedVoucher.discount_amount : 0;

  // Tính thuế VAT bóc tách theo giá đã bao gồm VAT (PRICE_INCLUDES_VAT = true)
  const itemTotals = items.map(it => {
    const toppingTotal = (it.selected_toppings || []).reduce((sum, t) => sum + (t.price || 0), 0);
    return ((it.dish_price || 0) + toppingTotal) * it.quantity;
  });

  // Phân bổ giảm giá phần dư lớn nhất
  let allocatedDiscounts = items.map(() => 0);
  if (discountAmount > 0 && subtotal > 0) {
    const factor = discountAmount / subtotal;
    let totalAllocated = 0;
    const remainders = itemTotals.map((tot, idx) => {
      const exact = tot * factor;
      const floored = Math.floor(exact);
      totalAllocated += floored;
      return { idx, remainder: exact - floored, floored };
    });
    let diff = discountAmount - totalAllocated;
    remainders.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < diff && i < remainders.length; i++) {
      remainders[i].floored += 1;
    }
    remainders.sort((a, b) => a.idx - b.idx);
    allocatedDiscounts = remainders.map(r => r.floored);
  }

  let totalBeforeVat = 0;
  let vat8Amount = 0;
  let vat10Amount = 0;

  items.forEach((it, idx) => {
    const netGross = Math.max(0, itemTotals[idx] - (allocatedDiscounts[idx] || 0));
    const rate = it.vat_category === 'alcohol' ? 0.10 : 0.08;
    const beforeVat = Math.round(netGross / (1 + rate));
    const vatVal = netGross - beforeVat;

    totalBeforeVat += beforeVat;
    if (rate === 0.08) {
      vat8Amount += vatVal;
    } else {
      vat10Amount += vatVal;
    }
  });

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const urlParams = new URLSearchParams(window.location.search);
  const tableParam = urlParams.get('table') || '';

  const defaultName = user ? user.name : '';
  const defaultPhone = user ? (user.phone || '') : '';

  const activeName = savedState && savedState.name !== null ? savedState.name : defaultName;
  const activePhone = savedState && savedState.phone !== null ? savedState.phone : defaultPhone;
  const activeAddress = savedState && savedState.address !== null ? savedState.address : '';
  const activeOrderType = savedState ? savedState.orderType : 'dine_in';
  const activePayment = savedState ? savedState.paymentMethod : 'cash';
  const activeTable = savedState && savedState.tableId ? savedState.tableId : (tableParam === 'TB-01' ? '1' : (tableParam === 'TB-02' ? '2' : (tableParam === 'TB-03' ? '3' : (tableParam === 'VIP-01' ? '5' : (tableParam === 'SV-01' ? '7' : '1')))));
  const activeRequestInvoice = savedState ? savedState.requestInvoice : false;
  const activeCompanyName = savedState ? savedState.invoiceCompanyName : '';
  const activeTaxId = savedState ? savedState.invoiceTaxId : '';
  const activeCompanyAddress = savedState ? savedState.invoiceCompanyAddress : '';
  const activeCompanyEmail = savedState ? savedState.invoiceCompanyEmail : '';

  checkoutModalEl.innerHTML = `
    <div class="modal-box" style="max-width: 650px;">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.3rem;">💳</span>
          <h3 style="font-size: 1.25rem;">Xác Nhận & Thanh Toán Đơn Hàng</h3>
        </div>
        <button id="btn-close-checkout" class="btn-icon" title="Đóng">&times;</button>
      </div>

      <div class="modal-body" style="padding: var(--space-6);">
        <form id="form-checkout">
          <!-- 1. Chọn loại hình phục vụ -->
          <div class="form-group">
            <label class="form-label">Loại hình phục vụ:</label>
            <div class="flex gap-2" id="order-type-tabs">
              <label class="btn btn-sm ${activeOrderType === 'dine_in' ? 'btn-primary' : 'btn-secondary'} flex-1 justify-center" style="cursor: pointer;">
                <input type="radio" name="order_type" value="dine_in" ${activeOrderType === 'dine_in' ? 'checked' : ''} style="display: none;" />
                🍽️ Tại bàn
              </label>
              <label class="btn btn-sm ${activeOrderType === 'takeaway' ? 'btn-primary' : 'btn-secondary'} flex-1 justify-center" style="cursor: pointer;">
                <input type="radio" name="order_type" value="takeaway" ${activeOrderType === 'takeaway' ? 'checked' : ''} style="display: none;" />
                🛍️ Mang đi
              </label>
              <label class="btn btn-sm ${activeOrderType === 'delivery' ? 'btn-primary' : 'btn-secondary'} flex-1 justify-center" style="cursor: pointer;">
                <input type="radio" name="order_type" value="delivery" ${activeOrderType === 'delivery' ? 'checked' : ''} style="display: none;" />
                🛵 Giao hàng
              </label>
            </div>
          </div>

          <!-- Nhập số bàn nếu là Dùng tại bàn -->
          <div class="form-group" id="table-number-group" style="${activeOrderType === 'dine_in' ? 'display: block;' : 'display: none;'}">
            <label class="form-label" for="checkout-table-id">Chọn số bàn ăn (*):</label>
            <select id="checkout-table-id" class="select">
              <option value="1" ${activeTable === '1' ? 'selected' : ''}>Bàn 01 (Tầng 1 - 2 người)</option>
              <option value="2" ${activeTable === '2' ? 'selected' : ''}>Bàn 02 (Tầng 1 - 4 người)</option>
              <option value="3" ${activeTable === '3' ? 'selected' : ''}>Bàn 03 (Tầng 1 - 4 người)</option>
              <option value="5" ${activeTable === '5' ? 'selected' : ''}>Bàn VIP 01 (Tầng 2 - 8 người)</option>
              <option value="7" ${activeTable === '7' ? 'selected' : ''}>Sân Vườn 01 (Ngoài trời - 4 người)</option>
            </select>
          </div>

          <!-- Nhập địa chỉ nếu là Giao tận nơi -->
          <div class="form-group" id="delivery-address-group" style="${activeOrderType === 'delivery' ? 'display: block;' : 'display: none;'}">
            <label class="form-label" for="checkout-address">Địa chỉ giao hàng chi tiết (*):</label>
            <input type="text" id="checkout-address" class="input" placeholder="Số nhà, tên đường, phường, quận..." value="${escapeHtml(activeAddress)}" />
          </div>

          <!-- Thông tin người nhận -->
          <div class="grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="checkout-name">Họ tên (*):</label>
              <input type="text" id="checkout-name" class="input" value="${escapeHtml(activeName)}" required placeholder="Nguyễn Văn A" autocomplete="name" maxlength="50" />
              <span class="error-text" id="err-checkout-name" style="display: none;"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="checkout-phone">Số điện thoại (*):</label>
              <input type="tel" id="checkout-phone" class="input" value="${escapeHtml(activePhone)}" required placeholder="0901234567" inputmode="tel" autocomplete="tel" maxlength="12" />
              <span class="error-text" id="err-checkout-phone" style="display: none;"></span>
            </div>
          </div>

          <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: calc(-1 * var(--space-2)); margin-bottom: var(--space-4); line-height: 1.4;">
            Thông tin người nhận được dùng để liên hệ giao hàng và cập nhật đơn hàng theo <a href="/chinh-sach-bao-mat.html#privacy" target="_blank" rel="noopener" style="color: var(--color-primary); text-decoration: underline;">Chính sách bảo mật</a>.
          </p>

          <!-- 2. Mục 6: Khuyến Mãi & Voucher -->
          <div style="background: var(--color-surface-alt); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-4); border: 1px dashed var(--color-border);">
            <label class="form-label" style="display: block; margin-bottom: var(--space-2);">🎟️ Áp dụng mã Voucher giảm giá:</label>
            <div class="flex gap-2">
              <input 
                type="text" 
                id="input-voucher-code" 
                class="input flex-1" 
                placeholder="Nhập mã (ví dụ: WELCOME50, VINHAMINH)" 
                value="${appliedVoucher ? escapeHtml(appliedVoucher.code) : ''}"
                style="text-transform: uppercase;"
              />
              <button type="button" id="btn-apply-voucher" class="btn btn-secondary">
                Áp dụng
              </button>
            </div>

            <!-- Gợi ý voucher khả dụng 1-click -->
            ${availableVouchers.length > 0 ? `
              <div style="margin-top: var(--space-3); font-size: 0.8rem; color: var(--color-text-muted);">
                <span style="font-weight: 600;">Gợi ý mã dành cho bạn:</span>
                <div class="flex flex-wrap gap-2" style="margin-top: 4px;">
                  ${availableVouchers.map(v => `
                    <button type="button" class="btn btn-sm btn-outline btn-quick-voucher" data-code="${escapeHtml(v.code)}" style="padding: 2px 8px; font-size: 0.75rem;">
                      ${escapeHtml(v.code)} (${v.discount_type === 'percent' ? `-${v.discount_value}%` : `-${formatCurrency(v.discount_value)}`})
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${appliedVoucher ? `
              <div class="flex items-center justify-between" style="margin-top: var(--space-2); color: var(--color-success); font-weight: 600; font-size: 0.9rem;">
                <span>✅ Đã áp dụng: ${escapeHtml(appliedVoucher.code)}</span>
                <span>-${formatCurrency(appliedVoucher.discount_amount)}</span>
              </div>
            ` : ''}
          </div>

          <!-- 3. Phương thức thanh toán -->
          <div class="form-group">
            <label class="form-label">Phương thức thanh toán:</label>
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-3 card" style="padding: 0.65rem 1rem; cursor: pointer;">
                <input type="radio" name="payment_method" value="cash" ${activePayment === 'cash' ? 'checked' : ''} style="accent-color: var(--color-primary);" />
                <span>💵 Tiền mặt khi nhận hàng / tại quầy</span>
              </label>
              <label class="flex items-center gap-3 card" style="padding: 0.65rem 1rem; cursor: pointer;">
                <input type="radio" name="payment_method" value="qr_pay" ${activePayment === 'qr_pay' ? 'checked' : ''} style="accent-color: var(--color-primary);" />
                <span>📱 Quét mã QR chuyển khoản ngân hàng (VietQR Sandbox)</span>
              </label>
              <label class="flex items-center gap-3 card" style="padding: 0.65rem 1rem; cursor: pointer;">
                <input type="radio" name="payment_method" value="sandbox_card" ${activePayment === 'sandbox_card' ? 'checked' : ''} style="accent-color: var(--color-primary);" />
                <span>💳 Thẻ ATM / Visa / Ví điện tử giả lập</span>
              </label>
            </div>
          </div>

          <!-- 4. Yêu cầu xuất Hóa đơn điện tử GTGT -->
          <div style="background: var(--color-surface-alt); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-4); border: 1px solid var(--color-border);">
            <label class="flex items-center gap-2" style="cursor: pointer; font-weight: 600; font-size: 0.95rem;">
              <input type="checkbox" id="chk-request-invoice" ${activeRequestInvoice ? 'checked' : ''} style="accent-color: var(--color-primary); width: 18px; height: 18px;" />
              <span>🧾 Yêu cầu xuất hóa đơn điện tử (VAT) doanh nghiệp</span>
            </label>

            <div id="invoice-fields" style="${activeRequestInvoice ? 'display: block;' : 'display: none;'} margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px dashed var(--color-border);">
              <div class="form-group" style="margin-bottom: var(--space-3);">
                <label class="form-label" for="invoice-company-name">Tên đơn vị / công ty (*):</label>
                <input type="text" id="invoice-company-name" class="input" placeholder="Ví dụ: Công ty TNHH Ẩm Thực Miền Tây" value="${escapeHtml(activeCompanyName)}" />
                <span class="error-text" id="err-invoice-company-name" style="display: none;"></span>
              </div>
              <div class="form-group" style="margin-bottom: var(--space-3);">
                <label class="form-label" for="invoice-tax-id">Mã số thuế doanh nghiệp (*):</label>
                <input type="text" id="invoice-tax-id" class="input" placeholder="10 số hoặc 13 số có gạch nối (0000000000 nếu là DEMO)" value="${escapeHtml(activeTaxId)}" maxlength="14" />
                <span class="error-text" id="err-invoice-tax-id" style="display: none;"></span>
                <span style="display: block; font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px;">
                  MST gồm 10 chữ số hoặc 13 chữ số chi nhánh (VD: 0312345678 hoặc 0312345678-001).
                </span>
              </div>
              <div class="form-group" style="margin-bottom: var(--space-3);">
                <label class="form-label" for="invoice-company-address">Địa chỉ trụ sở công ty (*):</label>
                <input type="text" id="invoice-company-address" class="input" placeholder="Số nhà, tên đường, phường, quận, tỉnh/TP" value="${escapeHtml(activeCompanyAddress)}" />
                <span class="error-text" id="err-invoice-company-address" style="display: none;"></span>
              </div>
              <div class="form-group">
                <label class="form-label" for="invoice-company-email">Email nhận hóa đơn điện tử (*):</label>
                <input type="email" id="invoice-company-email" class="input" placeholder="ketoan@congty.com" value="${escapeHtml(activeCompanyEmail)}" />
                <span class="error-text" id="err-invoice-company-email" style="display: none;"></span>
              </div>
            </div>
          </div>

          <!-- Tổng kết chi phí -->
          <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-4); font-size: 0.95rem;">
            <div class="flex justify-between" style="color: var(--color-text-muted); margin-bottom: 4px;">
              <span>Tạm tính (Đã bao gồm VAT):</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            ${appliedVoucher ? `
              <div class="flex justify-between" style="color: var(--color-success); margin-bottom: 4px;">
                <span>Giảm giá Voucher:</span>
                <span>-${formatCurrency(appliedVoucher.discount_amount)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between" style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 4px;">
              <span>↳ Trong đó chưa thuế:</span>
              <span>${formatCurrency(totalBeforeVat)}</span>
            </div>
            ${vat8Amount > 0 ? `
              <div class="flex justify-between" style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 4px;">
                <span>↳ Thuế VAT 8% (thức ăn, nước ngọt):</span>
                <span>${formatCurrency(vat8Amount)}</span>
              </div>
            ` : ''}
            ${vat10Amount > 0 ? `
              <div class="flex justify-between" style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 4px;">
                <span>↳ Thuế VAT 10% (rượu, bia):</span>
                <span>${formatCurrency(vat10Amount)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between" style="font-size: 1.25rem; font-weight: 800; border-top: 1px dashed var(--color-border); padding-top: var(--space-2); margin-top: 6px;">
              <span>Tổng thanh toán:</span>
              <span style="color: var(--color-primary);">${formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <button type="submit" id="btn-submit-order" class="btn btn-primary btn-lg" style="width: 100%;">
            🚀 Xác Nhận Đặt Hàng (${formatCurrency(grandTotal)})
          </button>
        </form>
      </div>
    </div>
  `;

  attachCheckoutEvents();
}

function showFieldError(elementId, inputEl, message) {
  const errEl = checkoutModalEl.querySelector(`#${elementId}`);
  if (errEl) {
    errEl.textContent = `⚠️ ${message}`;
    errEl.style.display = 'block';
  }
  if (inputEl) {
    inputEl.classList.add('input-error');
  }
}

function hideFieldError(elementId, inputEl) {
  const errEl = checkoutModalEl.querySelector(`#${elementId}`);
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
  if (inputEl) {
    inputEl.classList.remove('input-error');
  }
}

function attachCheckoutEvents() {
  const closeBtn = checkoutModalEl.querySelector('#btn-close-checkout');
  if (closeBtn) closeBtn.addEventListener('click', closeCheckoutModal);

  const nameInput = checkoutModalEl.querySelector('#checkout-name');
  const phoneInput = checkoutModalEl.querySelector('#checkout-phone');

  bindNameInput(nameInput);
  bindPhoneInput(phoneInput);

  nameInput?.addEventListener('input', () => hideFieldError('err-checkout-name', nameInput));
  phoneInput?.addEventListener('input', () => hideFieldError('err-checkout-phone', phoneInput));

  nameInput?.addEventListener('blur', () => {
    const val = nameInput.value.trim();
    if (val && !isValidName(val)) {
      showFieldError('err-checkout-name', nameInput, 'Họ tên chỉ gồm chữ cái, không chứa số.');
    }
  });

  phoneInput?.addEventListener('blur', () => {
    const val = phoneInput.value.trim();
    if (val && !isValidPhone(val, false)) {
      showFieldError('err-checkout-phone', phoneInput, 'Số điện thoại không hợp lệ (ví dụ 0901234567).');
    }
  });

  // Toggle form Hóa đơn điện tử
  const chkInvoice = checkoutModalEl.querySelector('#chk-request-invoice');
  const invoiceFields = checkoutModalEl.querySelector('#invoice-fields');
  const compNameInput = checkoutModalEl.querySelector('#invoice-company-name');
  const taxIdInput = checkoutModalEl.querySelector('#invoice-tax-id');
  const compAddressInput = checkoutModalEl.querySelector('#invoice-company-address');
  const compEmailInput = checkoutModalEl.querySelector('#invoice-company-email');

  chkInvoice?.addEventListener('change', (e) => {
    if (invoiceFields) {
      invoiceFields.style.display = e.target.checked ? 'block' : 'none';
    }
  });

  compNameInput?.addEventListener('input', () => hideFieldError('err-invoice-company-name', compNameInput));
  compAddressInput?.addEventListener('input', () => hideFieldError('err-invoice-company-address', compAddressInput));

  taxIdInput?.addEventListener('input', () => hideFieldError('err-invoice-tax-id', taxIdInput));
  taxIdInput?.addEventListener('blur', () => {
    const val = taxIdInput.value.trim();
    if (chkInvoice?.checked && val && !isValidTaxId(val)) {
      showFieldError('err-invoice-tax-id', taxIdInput, 'Mã số thuế không hợp lệ theo quy chuẩn Modulo 11.');
    }
  });

  compEmailInput?.addEventListener('input', () => hideFieldError('err-invoice-company-email', compEmailInput));
  compEmailInput?.addEventListener('blur', () => {
    const val = compEmailInput.value.trim();
    if (chkInvoice?.checked && val && !isValidEmail(val)) {
      showFieldError('err-invoice-company-email', compEmailInput, 'Email nhận hóa đơn không hợp lệ.');
    }
  });

  // Đổi loại hình phục vụ
  const typeRadios = checkoutModalEl.querySelectorAll('input[name="order_type"]');
  const tableGroup = checkoutModalEl.querySelector('#table-number-group');
  const addressGroup = checkoutModalEl.querySelector('#delivery-address-group');
  const typeLabels = checkoutModalEl.querySelectorAll('#order-type-tabs label');

  typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      typeLabels.forEach(l => {
        l.className = 'btn btn-sm btn-secondary flex-1 justify-center';
      });
      e.target.parentElement.className = 'btn btn-sm btn-primary flex-1 justify-center';

      if (e.target.value === 'dine_in') {
        tableGroup.style.display = 'block';
        addressGroup.style.display = 'none';
      } else if (e.target.value === 'delivery') {
        tableGroup.style.display = 'none';
        addressGroup.style.display = 'block';
      } else {
        tableGroup.style.display = 'none';
        addressGroup.style.display = 'none';
      }
    });
  });

  // Áp dụng voucher (giữ nguyên dữ liệu form đã nhập)
  const applyVoucherBtn = checkoutModalEl.querySelector('#btn-apply-voucher');
  const voucherInput = checkoutModalEl.querySelector('#input-voucher-code');

  const handleApplyVoucher = async (code) => {
    if (!code) {
      showToast('Vui lòng nhập mã voucher.', 'warning');
      return;
    }
    const subtotal = cartService.getSubtotal();
    try {
      applyVoucherBtn.disabled = true;
      const res = await api.post('/vouchers/validate', { code, subtotal });
      appliedVoucher = res.data;
      showToast(res.message, 'success');
      // Lưu lại trạng thái form trước khi render lại
      const savedState = captureFormState();
      renderCheckoutContent(savedState);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (applyVoucherBtn) applyVoucherBtn.disabled = false;
    }
  };

  if (applyVoucherBtn && voucherInput) {
    applyVoucherBtn.addEventListener('click', () => handleApplyVoucher(voucherInput.value.trim()));
  }

  checkoutModalEl.querySelectorAll('.btn-quick-voucher').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      handleApplyVoucher(code);
    });
  });

  // Xử lý tạo đơn hàng
  const form = checkoutModalEl.querySelector('#form-checkout');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!isOrderingAllowed()) {
        showToast(getOrderingMessage() || 'Nhà hàng hiện đang đóng cửa nhận đơn!', 'error', 5000);
        return;
      }

      const submitBtn = checkoutModalEl.querySelector('#btn-submit-order');

      const orderType = checkoutModalEl.querySelector('input[name="order_type"]:checked').value;
      const paymentMethod = checkoutModalEl.querySelector('input[name="payment_method"]:checked').value;
      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const address = orderType === 'delivery' ? checkoutModalEl.querySelector('#checkout-address').value.trim() : null;
      const tableId = orderType === 'dine_in' ? parseInt(checkoutModalEl.querySelector('#checkout-table-id').value) : null;

      let firstErr = null;
      if (!isValidName(name)) {
        showFieldError('err-checkout-name', nameInput, 'Họ tên chỉ gồm chữ cái, không chứa số.');
        if (!firstErr) firstErr = nameInput;
      }
      if (!isValidPhone(phone, false)) {
        showFieldError('err-checkout-phone', phoneInput, 'Số điện thoại không hợp lệ (ví dụ 0901234567).');
        if (!firstErr) firstErr = phoneInput;
      }

      // Kiểm tra hóa đơn công ty nếu tick
      const reqInvoice = chkInvoice ? chkInvoice.checked : false;
      let compName = null;
      let taxId = null;
      let compAddress = null;
      let compEmail = null;

      if (reqInvoice) {
        compName = compNameInput ? compNameInput.value.trim() : '';
        taxId = taxIdInput ? taxIdInput.value.trim() : '';
        compAddress = compAddressInput ? compAddressInput.value.trim() : '';
        compEmail = compEmailInput ? compEmailInput.value.trim() : '';

        if (!compName) {
          showFieldError('err-invoice-company-name', compNameInput, 'Vui lòng nhập tên công ty / đơn vị.');
          if (!firstErr) firstErr = compNameInput;
        }
        if (!isValidTaxId(taxId)) {
          showFieldError('err-invoice-tax-id', taxIdInput, 'Mã số thuế không hợp lệ theo quy chuẩn Modulo 11.');
          if (!firstErr) firstErr = taxIdInput;
        }
        if (!compAddress) {
          showFieldError('err-invoice-company-address', compAddressInput, 'Vui lòng nhập địa chỉ trụ sở công ty.');
          if (!firstErr) firstErr = compAddressInput;
        }
        if (!isValidEmail(compEmail)) {
          showFieldError('err-invoice-company-email', compEmailInput, 'Email nhận hóa đơn không hợp lệ.');
          if (!firstErr) firstErr = compEmailInput;
        }
      }

      if (firstErr) {
        firstErr.focus();
        return;
      }

      if (orderType === 'delivery' && !address) {
        showToast('Vui lòng nhập địa chỉ giao hàng.', 'warning');
        checkoutModalEl.querySelector('#checkout-address')?.focus();
        return;
      }

      const items = cartService.getItems();

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý đơn hàng...';

        const payload = {
          order_type: orderType,
          table_id: tableId,
          customer_name: name,
          customer_phone: phone,
          delivery_address: address,
          payment_method: paymentMethod,
          voucher_code: appliedVoucher ? appliedVoucher.code : null,
          invoice_company_name: reqInvoice ? compName : null,
          invoice_tax_id: reqInvoice ? taxId : null,
          invoice_address: reqInvoice ? compAddress : null,
          invoice_email: reqInvoice ? compEmail : null,
          items
        };

        const res = await api.post('/orders', payload);

        showToast('Đặt món thành công! Bếp đang nhận phiếu.', 'success', 4000);
        cartService.clearCart();
        closeCartDrawer();
        closeCheckoutModal();

        // Lưu mã đơn vào danh sách máy khách nếu là khách vãng lai
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          try {
            const guestOrders = JSON.parse(localStorage.getItem('vnm_guest_orders') || '[]');
            if (!guestOrders.includes(res.data.order_code)) {
              guestOrders.unshift(res.data.order_code);
            }
            localStorage.setItem('vnm_guest_orders', JSON.stringify(guestOrders));
          } catch (_) {}
        }

        openOrderTrackingModal(res.data.order_code);
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Xác Nhận Đặt Hàng';
      }
    });
  }
}
