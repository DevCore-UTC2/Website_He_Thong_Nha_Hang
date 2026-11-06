/**
 * TOAST NOTIFICATION COMPONENT — VỊ NHÀ MÌNH (T30 WCAG 2.1 AA)
 * Đạt chuẩn A11y: aria-live="polite", aria-atomic="true", role="status"
 */

import { escapeHtml } from '../utils/format.js';

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'status');
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toastContainer);
  }
}

export function showToast(message, type = 'success', duration = 3000) {
  ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  let icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `
    <span style="font-size: 1.25rem;" aria-hidden="true">${icon}</span>
    <span style="flex: 1; font-weight: 500;">${escapeHtml(message)}</span>
    <button class="toast__close" aria-label="Đóng thông báo" style="color: var(--color-text-muted); font-size: 1.1rem; line-height: 1; background: none; border: none; cursor: pointer; min-width: 32px; min-height: 32px; display: inline-flex; align-items: center; justify-content: center;">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'opacity var(--dur-normal) var(--ease-out), transform var(--dur-normal) var(--ease-out)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
