/**
 * UTILS - FORMATTING & MODAL HELPERS
 * Hỗ trợ định dạng tiền tệ VNĐ, ngày giờ chuẩn Việt Nam, chống XSS và quản lý modal scroll
 */

export function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function truncateText(text, maxLength = 80) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function lockScroll() {
  window.__openModalCount = (window.__openModalCount || 0) + 1;
  document.body.style.overflow = 'hidden';
}

export function unlockScroll() {
  window.__openModalCount = Math.max(0, (window.__openModalCount || 1) - 1);
  if (window.__openModalCount === 0) {
    document.body.style.overflow = '';
  }
}
