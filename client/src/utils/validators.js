/**
 * CLIENT FORM VALIDATORS — VỊ NHÀ MÌNH
 * Re-export từ /shared/validators.js và bổ sung các hàm DOM binding
 */

export {
  COUNTRY_CALLING_CODES,
  normalizePhoneE164,
  isValidPhoneE164,
  isValidEmail,
  validatePassword,
  isValidName,
  isValidTaxId
} from '/shared/validators.js';

import { isValidPhoneE164, normalizePhoneE164 } from '/shared/validators.js';

/**
 * Kiểm tra số điện thoại (hỗ trợ cả chuẩn E.164 và 10 số nội địa Việt Nam)
 * @param {string} phone
 * @param {boolean} [optional=false]
 * @returns {boolean}
 */
export function isValidPhone(phone, optional = false) {
  if (!phone || !phone.trim()) {
    return Boolean(optional);
  }
  const e164 = normalizePhoneE164(phone);
  return e164 !== null && isValidPhoneE164(e164);
}

/** Tự động làm sạch ô nhập họ tên khi người dùng gõ */
export function bindNameInput(input) {
  if (!input) return;
  input.setAttribute('autocomplete', 'name');
  input.setAttribute('maxlength', '50');

  let isComposing = false;

  const sanitizeName = () => {
    const original = input.value;
    let cleaned = original.replace(/[^\p{L}\s'.-]/gu, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    if (cleaned.length > 50) cleaned = cleaned.slice(0, 50);
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
  };

  input.addEventListener('compositionstart', () => { isComposing = true; });
  input.addEventListener('compositionend', () => { isComposing = false; sanitizeName(); });
  input.addEventListener('input', (e) => {
    if (e.isComposing || isComposing) return;
    sanitizeName();
  });
  input.addEventListener('paste', () => { setTimeout(sanitizeName, 0); });
  input.addEventListener('blur', () => {
    const trimmed = input.value.trim().replace(/\s{2,}/g, ' ');
    if (input.value !== trimmed) {
      input.value = trimmed;
    }
  });
}

/** Tự động làm sạch ô nhập số điện thoại khi người dùng gõ */
export function bindPhoneInput(input) {
  if (!input) return;
  input.setAttribute('type', 'tel');
  input.setAttribute('inputmode', 'tel');
  input.setAttribute('autocomplete', 'tel');
  input.setAttribute('maxlength', '16');

  let isComposing = false;

  const sanitizePhone = () => {
    const val = input.value;
    let clean = '';
    for (let i = 0; i < val.length; i++) {
      const char = val[i];
      if (i === 0 && char === '+') {
        clean += char;
      } else if (/\d/.test(char)) {
        clean += char;
      }
    }
    clean = clean.slice(0, 16);
    if (input.value !== clean) {
      input.value = clean;
    }
  };

  input.addEventListener('compositionstart', () => { isComposing = true; });
  input.addEventListener('compositionend', () => { isComposing = false; sanitizePhone(); });
  input.addEventListener('input', (e) => {
    if (e.isComposing || isComposing) return;
    sanitizePhone();
  });
  input.addEventListener('paste', () => { setTimeout(sanitizePhone, 0); });
  input.addEventListener('blur', () => {
    sanitizePhone();
  });
}
