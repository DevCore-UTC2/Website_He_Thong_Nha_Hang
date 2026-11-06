/**
 * UI FEEDBACK & MICRO-INTERACTION MODULE (Nhóm 3: T3.1, T3.2, T3.3, T3.4)
 * Module dùng chung xử lý rung xúc giác (Haptic Feedback) và hiệu ứng thị giác fallback.
 */

/**
 * Kiểm tra người dùng có bật chế độ giảm chuyển động (prefers-reduced-motion) không.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Rung nhẹ xúc giác (Haptic feedback) an toàn trên mọi thiết bị và trình duyệt.
 * @param {number|number[]} pattern - Thời lượng rung (ms) hoặc chuỗi rung/nghỉ
 * @returns {boolean} - true nếu thiết bị hỗ trợ và kích hoạt thành công
 */
export function triggerHaptic(pattern = 15) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  try {
    return navigator.vibrate(pattern);
  } catch (e) {
    return false;
  }
}

/**
 * Kích hoạt hiệu ứng phản hồi xúc giác + thị giác khi bấm nút hoặc tương tác.
 * @param {HTMLElement} element - Phần tử nhận hiệu ứng
 * @param {number} [hapticMs=12] - Thời gian rung (10-15ms)
 */
export function triggerPressFeedback(element, hapticMs = 12) {
  triggerHaptic(hapticMs);

  if (!element || prefersReducedMotion()) return;

  element.classList.add('ui-tap-active');
  setTimeout(() => {
    element.classList.remove('ui-tap-active');
  }, 150);
}

/**
 * Hiệu ứng rung lắc (Shake) kèm rung xúc giác cho form lỗi hoặc thao tác thất bại.
 * @param {HTMLElement} element - Phần tử cần rung lắc (form, dialog, button, input)
 * @param {number[]} [hapticPattern=[20, 40, 20]] - Kiểu rung cảnh báo
 */
export function triggerShake(element, hapticPattern = [20, 40, 20]) {
  triggerHaptic(hapticPattern);

  if (!element || prefersReducedMotion()) return;

  element.classList.remove('ui-shake');
  // Trigger reflow để animation có thể chạy lại liên tiếp
  void element.offsetWidth;
  element.classList.add('ui-shake');

  setTimeout(() => {
    element.classList.remove('ui-shake');
  }, 400);
}

/**
 * Hiệu ứng nảy nhẹ (Bounce) cho modal khi click ngoài, hoặc giỏ hàng khi thêm món.
 * @param {HTMLElement} element - Phần tử cần nảy nhẹ
 * @param {number} [hapticMs=10]
 */
export function triggerBounce(element, hapticMs = 10) {
  triggerHaptic(hapticMs);

  if (!element || prefersReducedMotion()) return;

  element.classList.remove('ui-bounce');
  void element.offsetWidth;
  element.classList.add('ui-bounce');

  setTimeout(() => {
    element.classList.remove('ui-bounce');
  }, 400);
}

/**
 * Đánh dấu input lỗi với viền đỏ và rung lắc.
 * @param {HTMLElement} inputEl
 */
export function triggerInputError(inputEl) {
  triggerHaptic([15, 30, 15]);

  if (!inputEl) return;
  inputEl.classList.add('ui-input-error');
  triggerShake(inputEl);

  inputEl.focus();
}

/**
 * Khởi tạo event delegation toàn cục cho hiệu ứng bấm nút (T3.2)
 * Bắt tất cả tương tác trên các nút bấm (button, .btn, .btn-icon, [role="button"])
 * Rung nhẹ 12ms (navigator.vibrate 10-15ms) và gắn class fallback scale(0.96)
 */
export function initButtonFeedbackListener() {
  if (typeof document === 'undefined') return;

  if (document.__uiFeedbackInitialized) return;
  document.__uiFeedbackInitialized = true;

  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('button, .btn, .btn-icon, [role="button"]');
    if (!btn || btn.disabled) return;

    // Rung nhẹ xúc giác 12ms (nằm trong khoảng 10-15ms)
    triggerHaptic(12);

    // Hiệu ứng thị giác fallback scale(0.96) qua class dùng chung
    if (!prefersReducedMotion()) {
      btn.classList.add('ui-tap-active');

      const cleanup = () => {
        btn.classList.remove('ui-tap-active');
        btn.removeEventListener('pointerup', cleanup);
        btn.removeEventListener('pointercancel', cleanup);
        btn.removeEventListener('pointerleave', cleanup);
      };

      btn.addEventListener('pointerup', cleanup, { once: true });
      btn.addEventListener('pointercancel', cleanup, { once: true });
      btn.addEventListener('pointerleave', cleanup, { once: true });

      setTimeout(cleanup, 200);
    }
  }, { passive: true });
}
