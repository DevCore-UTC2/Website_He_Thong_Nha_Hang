/**
 * MAIN JAVASCRIPT ENTRY — VỊ NHÀ MÌNH
 * Ẩm thực miền Tây & Nam Bộ
 */
import { api } from './services/api.js';
import { authService } from './services/auth.js';
import { cartService } from './services/cart.js';
import { initCartDrawer, openCartDrawer } from './pages/customer/CartDrawer.js';
import { openAuthModal } from './components/AuthModal.js';
import { openReservationModal } from './pages/customer/ReservationModal.js';
import { initMenu } from './pages/customer/Menu.js';
import { initBestsellerSection } from './pages/customer/BestsellerSection.js';
import { renderFamilyMealBannerHTML } from './pages/customer/FamilyMeal.js';
import { openRecentOrderStatus } from './pages/customer/OrderTrackingModal.js';
import { showToast } from './components/Toast.js';
import { escapeHtml } from './utils/format.js';
import { Icons, iconHtml } from './components/icons.js';
import { initButtonFeedbackListener, triggerBounce } from './utils/ui-feedback.js';
import { fetchStoreStatus, isOrderingAllowed } from './services/storeService.js';

/** Dynamic imports cho các modal tác vụ và quản trị để tối ưu tải trang (Task 8) */
export async function initTableMapSection() {
  const mod = await import('./pages/customer/TableMapSection.js');
  return mod.initTableMapSection();
}

export async function openAdminManager(tab) {
  const mod = await import('./pages/admin/AdminManager.js');
  return mod.openAdminManager(tab);
}

export async function openKitchenDisplay() {
  const mod = await import('./pages/staff/KitchenDisplay.js');
  return mod.openKitchenDisplay();
}

export async function openTableMapModal() {
  const mod = await import('./pages/staff/TableMapModal.js');
  return mod.openTableMapModal();
}

export async function openLoyaltyModal() {
  const mod = await import('./pages/customer/LoyaltyModal.js');
  return mod.openLoyaltyModal();
}

export async function openFamilyMealModal() {
  const mod = await import('./pages/customer/FamilyMeal.js');
  return mod.openFamilyMealModal();
}

// Ảnh lỗi: logo thì ẩn, ảnh món thì dùng placeholder (thay cho onerror inline bị CSP chặn)
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallbackDone) return;
  img.dataset.fallbackDone = '1';
  if (img.closest('.brand, .sidebar-header, .footer-brand') || img.getAttribute('aria-hidden') === 'true') {
    img.style.display = 'none';
    return;
  }
  img.src = '/public/images/menu/placeholder.svg';
}, true);

document.addEventListener('DOMContentLoaded', () => {
  const safeInit = (fn, name) => {
    try {
      fn();
    } catch (err) {
      console.warn(`[Init] Lỗi khởi tạo ${name}:`, err);
    }
  };

  // 1. Khởi tạo tức thì các thành phần giao diện thiết yếu (Critical UI)
  safeInit(injectIcons, 'injectIcons');
  safeInit(initCustomCursor, 'initCustomCursor');
  safeInit(initTheme, 'initTheme');
  safeInit(initOpenStatus, 'initOpenStatus');
  safeInit(initHeader, 'initHeader');
  safeInit(initSidebar, 'initSidebar');
  safeInit(initCartDrawer, 'initCartDrawer');
  if (document.querySelector('#bestseller-container')) {
    safeInit(initBestsellerSection, 'initBestsellerSection');
  }
  if (document.querySelector('#menu-container')) {
    safeInit(initMenu, 'initMenu');
  }
  safeInit(initFamilyMealBanner, 'initFamilyMealBanner');
  safeInit(initButtonFeedbackListener, 'initButtonFeedbackListener');
  safeInit(initPageLoader, 'initPageLoader');
  safeInit(checkQrTableUrl, 'checkQrTableUrl');

  // 2. Trì hoãn các hiệu ứng thị giác phụ và widget thứ cấp khi CPU rảnh rỗi (Idle / Non-blocking)
  const initDeferredEffects = () => {
    safeInit(initHeroParallax, 'initHeroParallax');
    safeInit(initScrollAnimations, 'initScrollAnimations');
    safeInit(initPageTransitions, 'initPageTransitions');
    safeInit(initScrollProgressBar, 'initScrollProgressBar');
    safeInit(initMagneticButtons, 'initMagneticButtons');
    safeInit(initInteractiveTilt, 'initInteractiveTilt');
    safeInit(setupLazyTableMapSection, 'setupLazyTableMapSection');
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(initDeferredEffects, { timeout: 1200 });
  } else {
    setTimeout(initDeferredEffects, 100);
  }

  window.openKitchenDisplay = openKitchenDisplay;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.openRecentOrderStatus = openRecentOrderStatus;

  window.addEventListener('auth:change', () => {
    updateAuthUI();
  });

  window.addEventListener('auth:expired', () => {
    showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'warning');
    updateAuthUI();
  });

  window.addEventListener('resize', () => {
    updateAuthUI();
  });
});

/** Tự động nhận diện bàn qua mã QR khi quét trên thiết bị (?table= hoặc ?qr=) */
async function checkQrTableUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tableToken = params.get('table') || params.get('qr');
    if (!tableToken) return;

    const res = await api.get('/tables/by-token/' + encodeURIComponent(tableToken));
    if (res && res.data) {
      showToast(`Quý khách đang quét mã Bàn số ${res.data.table_number} (${res.data.area || 'Tầng 1'}). Vui lòng điền thông tin đặt bàn!`, 'info', 6000);
      openReservationModal(res.data);
    }
  } catch (err) {
    console.warn('Lỗi đọc mã bàn QR từ URL:', err);
  }
}

/** Inject SVG icons vào các placeholder trong HTML */
function injectIcons() {
  const map = {
    'cart-icon-header':    Icons.cart,
    'auth-icon-header':    Icons.user,
    'lightning-icon':      Icons.star,    // biểu tượng "nhanh" trên hero badge
    'mobile-food-icon':    Icons.food,
    'mobile-calendar-icon': Icons.calendar,
    'mobile-kitchen-icon': Icons.kitchen,
    'mobile-tables-icon':  Icons.table,
    'mobile-settings-icon': Icons.settings,
    'mobile-cart-icon':    Icons.cart,
    'footer-location-icon': Icons.location,
    'footer-phone-icon':   Icons.phone,
    'footer-email-icon':   Icons.email,
  };
  for (const [id, svg] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg;
  }
}

/** Hiển thị trạng thái mở/đóng cửa đồng bộ với Server và Socket.IO (Store Status) */
function initOpenStatus() {
  const pill = document.getElementById('open-status-pill');
  if (!pill) return;

  function renderStatus(isOpen, message, title) {
    pill.className = `status-pill ${isOpen ? 'status-pill--open' : 'status-pill--close'}`;
    pill.innerHTML = `<span class="status-pill__dot"></span>${isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}`;
    pill.title = title || message || (isOpen ? 'Nhà hàng đang nhận đặt đơn (09:00 – 21:30)' : 'Nhà hàng đã đóng cửa nhận đơn (sau 21:30)');
  }

  // Lắng nghe sự kiện cập nhật trạng thái từ storeService
  window.addEventListener('store:status_updated', (e) => {
    const data = e.detail;
    if (data && typeof data.is_open === 'boolean') {
      renderStatus(data.is_open, data.message, data.message);
    }
  });

  // Tải trạng thái ban đầu
  fetchStoreStatus().then(status => {
    if (status && typeof status.is_open === 'boolean') {
      renderStatus(status.is_open, status.message, status.message);
    }
  });

  // Cập nhật định kỳ mỗi 60 giây
  setInterval(() => {
    fetchStoreStatus().then(status => {
      if (status && typeof status.is_open === 'boolean') {
        renderStatus(status.is_open, status.message, status.message);
      }
    });
  }, 60_000);
}

function initTheme() {
  const savedTheme = localStorage.getItem('vnm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggle = document.querySelector('#btn-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('vnm_theme', nextTheme);
      updateThemeIcon(nextTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#theme-icon');
  if (icon) {
    icon.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
  }
}

function initHeader() {
  // Hiệu ứng cuộn cho Header: trong suốt khi ở đỉnh trang, làm mờ frosted glass khi cuộn
  const header = document.querySelector('.site-header');
  if (header) {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 30) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  // Nút mở giỏ hàng
  const cartBtn = document.querySelector('#btn-open-cart');
  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);

  // Nút Mâm cơm gia đình
  const familyMealBtn = document.querySelector('#btn-open-family-meal');
  if (familyMealBtn) familyMealBtn.addEventListener('click', openFamilyMealModal);

  // Nút Sơ đồ bàn & QR trên Header Nav
  const navTablesBtn = document.querySelector('#btn-nav-tables');
  if (navTablesBtn) {
    navTablesBtn.addEventListener('click', () => {
      initTableMapSection().then(() => {
        const sec = document.querySelector('#table-map-section');
        if (sec) {
          sec.scrollIntoView({ behavior: 'smooth' });
        } else {
          openTableMapModal();
        }
      });
    });
  }

  // Nút Đặt bàn / Đặt tiệc
  const resBtn = document.querySelector('#btn-open-reservation');
  if (resBtn) resBtn.addEventListener('click', openReservationModal);

  // Nút Xem trạng thái đơn hàng gần nhất (Task 5)
  const headerOrderStatusBtn = document.querySelector('#btn-header-order-status');
  if (headerOrderStatusBtn) headerOrderStatusBtn.addEventListener('click', openRecentOrderStatus);

  // Nút Màn hình Bếp
  const kitchenBtn = document.querySelector('#btn-open-kitchen');
  if (kitchenBtn) kitchenBtn.addEventListener('click', openKitchenDisplay);

  // Nút Sơ đồ bàn & QR
  const tableBtn = document.querySelector('#btn-open-tables');
  if (tableBtn) tableBtn.addEventListener('click', openTableMapModal);

  // Nút Admin Panel
  const adminBtn = document.querySelector('#btn-open-admin');
  if (adminBtn) adminBtn.addEventListener('click', () => openAdminManager('dishes'));

  // Nút Hero Xem món theo mùa (T29)
  const heroSeasonBadge = document.querySelector('#hero-season-badge');
  if (heroSeasonBadge) {
    heroSeasonBadge.addEventListener('click', () => {
      window.location.href = '/menu.html';
    });
  }

  // Nút Xem thực đơn Hero
  const heroCta = document.querySelector('#btn-hero-menu');
  if (heroCta) {
    heroCta.addEventListener('click', () => {
      window.location.href = '/menu.html';
    });
  }

  // Nút Hero Đặt bàn
  const heroRes = document.querySelector('#btn-hero-reserve');
  if (heroRes) heroRes.addEventListener('click', openReservationModal);

  // Mobile Bottom Bar
  const mRes = document.querySelector('#btn-mobile-reserve');
  if (mRes) mRes.addEventListener('click', openReservationModal);

  const mKitchen = document.querySelector('#btn-mobile-kitchen');
  if (mKitchen) mKitchen.addEventListener('click', openKitchenDisplay);

  const mTables = document.querySelector('#btn-mobile-tables');
  if (mTables) mTables.addEventListener('click', openTableMapModal);

  const mAdmin = document.querySelector('#btn-mobile-admin');
  if (mAdmin) mAdmin.addEventListener('click', () => openAdminManager('dishes'));

  const mCart = document.querySelector('#btn-mobile-cart');
  if (mCart) mCart.addEventListener('click', openCartDrawer);

  // Badge giỏ hàng desktop & mobile (T3.4: Hiệu ứng nảy giỏ hàng)
  window.addEventListener('cart:change', () => {
    const count = cartService.getItemCount();

    const badge = document.querySelector('#header-cart-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
      if (count > 0) triggerBounce(badge);
    }

    const mBadge = document.querySelector('#mobile-cart-badge');
    if (mBadge) {
      mBadge.textContent = count;
      mBadge.style.display = count > 0 ? 'inline-flex' : 'none';
      if (count > 0) triggerBounce(mBadge);
    }
  });

  // Nút đăng nhập ban đầu
  const initAuthBtn = document.querySelector('#btn-open-auth');
  if (initAuthBtn) initAuthBtn.addEventListener('click', () => openAuthModal('login'));

  updateAuthUI();
}

/** Quản lý Sidebar & Overlay (Task 4) */
let sidebarLastFocus = null;

export function openSidebar() {
  const sidebar = document.querySelector('#app-sidebar');
  const overlay = document.querySelector('#sidebar-overlay');
  const toggleBtn = document.querySelector('#btn-toggle-sidebar');
  if (sidebar && overlay) {
    if (toggleBtn) toggleBtn.classList.add('is-active');
    sidebarLastFocus = document.activeElement;
    sidebar.removeAttribute('inert');
    sidebar.removeAttribute('aria-hidden');
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    const closeBtn = sidebar.querySelector('#btn-close-sidebar');
    if (closeBtn) closeBtn.focus();
  }
}

export function closeSidebar() {
  const sidebar = document.querySelector('#app-sidebar');
  const overlay = document.querySelector('#sidebar-overlay');
  const toggleBtn = document.querySelector('#btn-toggle-sidebar');
  if (sidebar && overlay) {
    if (toggleBtn) toggleBtn.classList.remove('is-active');
    const wasActive = sidebar.classList.contains('active');
    const focusInside = sidebar.contains(document.activeElement) || document.activeElement === document.body;
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    sidebar.setAttribute('aria-hidden', 'true');
    sidebar.setAttribute('inert', '');
    document.body.style.overflow = '';
    if (wasActive && focusInside && sidebarLastFocus && typeof sidebarLastFocus.focus === 'function') {
      sidebarLastFocus.focus();
    }
  }
}

function initSidebar() {
  const toggleBtn = document.querySelector('#btn-toggle-sidebar');
  const closeBtn = document.querySelector('#btn-close-sidebar');
  const overlay = document.querySelector('#sidebar-overlay');

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sidebar = document.querySelector('#app-sidebar');
      if (sidebar && sidebar.classList.contains('active')) {
        closeSidebar();
      }
    }
  });

  renderSidebarContent();
}

function renderSidebarContent() {
  const user = authService.getCurrentUser();
  const userCardEl = document.querySelector('#sidebar-user-card');
  const navEl = document.querySelector('#sidebar-nav');
  const footerEl = document.querySelector('#sidebar-footer');

  if (!userCardEl || !navEl || !footerEl) return;

  const roleBadgeClass = user
    ? (user.role === 'admin' ? 'badge-danger' : (user.role === 'staff' ? 'badge-amber' : 'badge-success'))
    : '';
  const roleLabel = user
    ? (user.role === 'admin' ? 'Quản Trị' : (user.role === 'staff' ? 'Nhân Viên' : 'Khách Hàng'))
    : '';

  // 1. Thẻ thông tin người dùng trong Sidebar
  if (user) {
    userCardEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="min-width: 0; flex: 1;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${escapeHtml(user.name)}
          </div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${escapeHtml(user.email || user.phone || 'Thành viên Vị Nhà Mình')}
          </div>
        </div>
        <span class="badge ${roleBadgeClass}" style="flex-shrink: 0; font-size: 0.65rem;">${roleLabel}</span>
      </div>
      <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; background: var(--color-surface); padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
        <span style="font-size: 0.8rem; font-weight: 600;">⭐ Điểm thưởng:</span>
        <button type="button" id="sidebar-btn-loyalty" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 2px 8px;">
          ${user.loyalty_points || 0} điểm
        </button>
      </div>
    `;

    const sidebarLoyaltyBtn = userCardEl.querySelector('#sidebar-btn-loyalty');
    if (sidebarLoyaltyBtn) {
      sidebarLoyaltyBtn.addEventListener('click', () => {
        closeSidebar();
        openLoyaltyModal();
      });
    }
  } else {
    userCardEl.innerHTML = `
      <div style="text-align: center; padding: 4px 0;">
        <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2px; color: var(--color-primary);">Khách Quý</div>
        <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 8px;">Đăng nhập để tích điểm và trải nghiệm đầy đủ</div>
        <button type="button" id="sidebar-btn-auth" class="btn btn-outline btn-sm" style="width: 100%;">
          ${iconHtml('user')} Đăng Nhập / Đăng Ký
        </button>
      </div>
    `;

    const sidebarAuthBtn = userCardEl.querySelector('#sidebar-btn-auth');
    if (sidebarAuthBtn) {
      sidebarAuthBtn.addEventListener('click', () => {
        closeSidebar();
        openAuthModal('login');
      });
    }
  }

  // 2. Danh sách liên kết điều hướng theo Role
  const isStaffOrAdmin = user && (user.role === 'staff' || user.role === 'admin');
  const isAdmin = user && user.role === 'admin';

  navEl.innerHTML = `
    <div class="sidebar-section-title">Khám Phá &amp; Đặt Món</div>
    <a href="/menu.html" class="sidebar-item" id="sidebar-nav-menu">
      <span>🍽️</span> <span>Thực Đơn Món Ăn</span>
    </a>
    <button type="button" class="sidebar-item" id="sidebar-nav-family-meal">
      <span>🍲</span> <span>Mâm Cơm Gia Đình</span>
    </button>
    <a href="#table-map-section" class="sidebar-item" id="sidebar-nav-customer-tables">
      <span>🗺️</span> <span>Sơ Đồ Bàn Ăn &amp; Mã QR</span>
    </a>
    <button type="button" class="sidebar-item" id="sidebar-nav-reservation">
      <span>📅</span> <span>Đặt Bàn Trực Tuyến</span>
    </button>

    <div class="sidebar-section-title">Tiện Ích</div>
    <a href="/tra-cuu-hoa-don.html" class="sidebar-item" id="sidebar-nav-invoice">
      <span>🧾</span> <span>Tra Cứu Hóa Đơn Điện Tử</span>
    </a>
    <button type="button" class="sidebar-item" id="sidebar-nav-order-status">
      <span>📦</span> <span>Theo Dõi Trạng Thái Đơn</span>
    </button>

    ${isStaffOrAdmin ? `
      <div class="sidebar-section-title">Tác Vụ Nhà Hàng</div>
      <button type="button" class="sidebar-item" id="sidebar-nav-kitchen">
        <span>👨‍🍳</span> <span>Màn Hình Bếp</span>
      </button>
      <button type="button" class="sidebar-item" id="sidebar-nav-tables">
        <span>🪑</span> <span>Sơ Đồ Bàn &amp; QR</span>
      </button>
    ` : ''}

    ${isAdmin ? `
      <div class="sidebar-section-title">Quản Trị Hệ Thống</div>
      <button type="button" class="sidebar-item" id="sidebar-nav-admin">
        <span>⚙️</span> <span>Hệ Thống Quản Trị</span>
      </button>
    ` : ''}
  `;

  // Gắn sự kiện các nav items trong Sidebar
  const navMenu = navEl.querySelector('#sidebar-nav-menu');
  if (navMenu) {
    navMenu.addEventListener('click', () => {
      closeSidebar();
    });
  }

  const navFamilyMeal = navEl.querySelector('#sidebar-nav-family-meal');
  if (navFamilyMeal) {
    navFamilyMeal.addEventListener('click', () => {
      closeSidebar();
      openFamilyMealModal();
    });
  }

  const navCustomerTables = navEl.querySelector('#sidebar-nav-customer-tables');
  if (navCustomerTables) {
    navCustomerTables.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
      const sec = document.querySelector('#table-map-section');
      if (sec) {
        sec.scrollIntoView({ behavior: 'smooth' });
      } else {
        openTableMapModal();
      }
    });
  }

  const navReservation = navEl.querySelector('#sidebar-nav-reservation');
  if (navReservation) {
    navReservation.addEventListener('click', () => {
      closeSidebar();
      openReservationModal();
    });
  }

  const navInvoice = navEl.querySelector('#sidebar-nav-invoice');
  if (navInvoice) {
    navInvoice.addEventListener('click', () => {
      closeSidebar();
    });
  }

  const navOrderStatus = navEl.querySelector('#sidebar-nav-order-status');
  if (navOrderStatus) {
    navOrderStatus.addEventListener('click', () => {
      closeSidebar();
      openRecentOrderStatus();
    });
  }

  const navKitchen = navEl.querySelector('#sidebar-nav-kitchen');
  if (navKitchen) {
    navKitchen.addEventListener('click', () => {
      closeSidebar();
      openKitchenDisplay();
    });
  }

  const navTables = navEl.querySelector('#sidebar-nav-tables');
  if (navTables) {
    navTables.addEventListener('click', () => {
      closeSidebar();
      openTableMapModal();
    });
  }

  const navAdmin = navEl.querySelector('#sidebar-nav-admin');
  if (navAdmin) {
    navAdmin.addEventListener('click', () => {
      closeSidebar();
      openAdminManager('dishes');
    });
  }

  // 3. Footer Sidebar (Đăng xuất hoặc trợ giúp)
  const privacyHtml = `
    <div style="margin-top: 10px; text-align: center; font-size: 0.75rem; color: var(--color-text-muted); border-top: 1px solid var(--color-border); padding-top: 8px;">
      <a href="/chinh-sach-bao-mat.html" style="color: var(--color-primary); text-decoration: underline;">Chính sách bảo mật &amp; Điều khoản</a>
      <div style="font-size: 0.7rem; margin-top: 4px; line-height: 1.3;">Muốn xóa tài khoản/dữ liệu: gửi email tới lienhe@vinhaminh.vn hoặc yêu cầu tại quầy.</div>
    </div>
  `;

  if (user) {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-outline btn-danger btn-sm" id="sidebar-btn-logout" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
        ${iconHtml('logout')} Đăng Xuất (${escapeHtml(user.name)})
      </button>
      ${privacyHtml}
    `;

    const logoutBtn = footerEl.querySelector('#sidebar-btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        closeSidebar();
        authService.logout();
        showToast('Bạn đã đăng xuất an toàn.', 'info');
      });
    }
  } else {
    footerEl.innerHTML = `
      <div style="text-align: center; font-size: 0.75rem; color: var(--color-text-muted);">
        📞 Hotline hỗ trợ: <strong>1900 8888</strong>
      </div>
      ${privacyHtml}
    `;
  }
}

function updateAuthUI() {
  const user = authService.getCurrentUser();
  const authContainer = document.querySelector('#auth-header-container');
  const toggleSidebarBtn = document.querySelector('#btn-toggle-sidebar');
  const staffButtons = document.querySelectorAll('.staff-only');
  const adminButtons = document.querySelectorAll('.admin-only');

  if (!authContainer) return;

  if (user) {
    const isStaffOrAdmin = user.role === 'staff' || user.role === 'admin';
    const roleBadgeClass = user.role === 'admin'
      ? 'badge-danger'
      : (user.role === 'staff' ? 'badge-amber' : 'badge-success');
    const roleLabel = user.role === 'admin'
      ? 'QUẢN TRỊ'
      : (user.role === 'staff' ? 'NHÂN VIÊN' : 'KHÁCH HÀNG');

    // Header: CHỈ giữ badge vai trò, bỏ chữ đen tên user, bỏ nút loyalty và logout khỏi header
    authContainer.innerHTML = `
      <button
        type="button"
        id="header-user-badge"
        class="badge ${roleBadgeClass}"
        style="cursor: pointer; font-size: 0.72rem; padding: 4px 8px; border: none; white-space: nowrap; line-height: 1.2;"
        title="${escapeHtml(user.name)} (${roleLabel}) – Nhấn để mở menu tác vụ"
        aria-label="Tài khoản ${escapeHtml(user.name)}"
      >
        ${roleLabel}
      </button>
    `;

    const userBadge = authContainer.querySelector('#header-user-badge');
    if (userBadge) {
      userBadge.addEventListener('click', openSidebar);
    }

    // Nút hamburger mở sidebar: luôn hiển thị thống nhất trên cả desktop và mobile (44x44px)
    if (toggleSidebarBtn) {
      toggleSidebarBtn.style.display = 'inline-flex';
    }

    staffButtons.forEach(b => b.style.display = isStaffOrAdmin ? 'inline-flex' : 'none');
    adminButtons.forEach(b => b.style.display = user.role === 'admin' ? 'inline-flex' : 'none');

    // Sơ đồ bàn trên mobile: hiển thị cho mọi tài khoản đã đăng nhập (bao gồm Khách hàng)
    const mTablesBtn = document.querySelector('#btn-mobile-tables');
    if (mTablesBtn) {
      mTablesBtn.style.display = 'inline-flex';
    }
  } else {
    authContainer.innerHTML = `
      <button id="btn-open-auth" class="btn btn-outline btn-sm">
        ${iconHtml('user')} Đăng Nhập
      </button>
    `;

    const newAuthBtn = authContainer.querySelector('#btn-open-auth');
    if (newAuthBtn) newAuthBtn.addEventListener('click', () => openAuthModal('login'));

    if (toggleSidebarBtn) {
      toggleSidebarBtn.style.display = 'inline-flex';
    }

    staffButtons.forEach(b => b.style.display = 'none');
    adminButtons.forEach(b => b.style.display = 'none');
  }

  // Cập nhật nội dung sidebar đồng bộ
  renderSidebarContent();
}

/** Khởi tạo Banner Mâm Cơm Gia Đình Nam Bộ */
function initFamilyMealBanner() {
  const container = document.querySelector('#family-meal-banner-container');
  if (!container) return;
  container.innerHTML = renderFamilyMealBannerHTML();

  const openBtn = container.querySelector('#btn-banner-open-family-meal');
  if (openBtn) {
    openBtn.addEventListener('click', openFamilyMealModal);
  }
}

/** 1. Màn hình loading thương hiệu & Chuỗi xuất hiện Stagger cho Hero */
function initPageLoader() {
  const loader = document.getElementById('app-page-loader');
  const dismiss = () => {
    document.body.classList.add('hero-ready');
    if (!loader || loader.classList.contains('page-loader--hidden')) {
      return;
    }
    loader.classList.add('page-loader--hidden');
    setTimeout(() => {
      if (loader && loader.parentNode) loader.remove();
    }, 350);
  };

  // Ẩn loader ngay khi DOM sẵn sàng để hiển thị giao diện tức thì, không gây nghẽn
  dismiss();
}

/** 2. Hiệu ứng Parallax đa tầng cho hình ảnh Hero khi di chuyển chuột */
function initHeroParallax() {
  const hero = document.querySelector('.hero');
  const stage = document.querySelector('.hero__art-stage');
  if (!hero || !stage) return;

  // Tôn trọng cài đặt giảm chuyển động và màn hình cảm ứng điện thoại
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 768px)').matches) return;

  let rafId = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const dishMain = stage.querySelector('.hero-dish--main');
  const dishTr = stage.querySelector('.hero-dish--tr');
  const dishBl = stage.querySelector('.hero-dish--bl');
  const dishBr = stage.querySelector('.hero-dish--br');

  function update() {
    currentX += (targetX - currentX) * 0.1;
    currentY += (targetY - currentY) * 0.1;

    stage.style.setProperty('--mx', currentX.toFixed(3));
    stage.style.setProperty('--my', currentY.toFixed(3));

    if (dishMain) dishMain.style.transform = `translate(calc(-50% + ${currentX * 10}px), calc(-50% + ${currentY * 10}px))`;
    if (dishTr) dishTr.style.transform = `translate(${currentX * 16}px, ${currentY * 16}px)`;
    if (dishBl) dishBl.style.transform = `translate(${-currentX * 14}px, ${-currentY * 14}px)`;
    if (dishBr) dishBr.style.transform = `translate(${currentX * 12}px, ${-currentY * 10}px)`;

    if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
      rafId = requestAnimationFrame(update);
    } else {
      rafId = null;
    }
  }

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    if (!rafId) {
      rafId = requestAnimationFrame(update);
    }
  }, { passive: true });

  hero.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
    if (!rafId) {
      rafId = requestAnimationFrame(update);
    }
  }, { passive: true });
}

/** 3. Cuộn trang mượt mà & Hiệu ứng đếm tăng thông số (Count-Up) */
function initScrollAnimations() {
  // IntersectionObserver cho các section
  if (typeof IntersectionObserver === 'undefined') {
    document.querySelectorAll('.section-header, .hero__specs-bar, #family-meal-banner-container, .site-footer__grid').forEach(el => {
      el.classList.add('is-revealed');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        // Kích hoạt hiệu ứng đếm số nếu là specs bar
        if (entry.target.classList.contains('hero__specs-bar')) {
          animateCountUp();
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.section-header, .hero__specs-bar, #family-meal-banner-container, .site-footer__grid').forEach(el => {
    el.classList.add('reveal-on-scroll');
    observer.observe(el);
  });

  function animateCountUp() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const statVals = document.querySelectorAll('.hero__spec-val');
    statVals.forEach(valEl => {
      const text = valEl.textContent.trim();
      if (text.includes('90')) {
        animateNumber(valEl, 0, 90, 1100, '+');
      } else if (text.includes('100')) {
        animateNumber(valEl, 0, 100, 1200, '%');
      }
    });
  }

  function animateNumber(el, start, end, duration, suffix = '') {
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing out cubic: 1 - pow(1 - progress, 3)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * eased);
      el.textContent = `${current}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = `${end}${suffix}`;
      }
    }
    requestAnimationFrame(tick);
  }
}

/** 4. Hiệu ứng chuyển trang mượt mà giữa các trang HTML */
function initPageTransitions() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
    if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;

    // Chỉ áp dụng chuyển trang mượt cho liên kết nội bộ trang web
    try {
      const url = new URL(href, window.location.href);
      if (url.origin === window.location.origin && url.pathname.endsWith('.html')) {
        e.preventDefault();
        document.body.classList.add('page-transitioning');
        setTimeout(() => {
          window.location.href = href;
        }, 140);
      }
    } catch {}
  });
}

/** 5. Thanh tiến trình cuộn trang trực quan (Master Prompt Phần 9) */
function initScrollProgressBar() {
  const bar = document.getElementById('scroll-progress-bar');
  if (!bar) return;

  let ticking = false;
  function update() {
    const scrollH = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollH <= 0) {
      bar.style.width = '0%';
    } else {
      const pct = Math.min(Math.max((window.scrollY / scrollH) * 100, 0), 100);
      bar.style.width = `${pct}%`;
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}

/** Tải lười (Lazy-load) Sơ Đồ Bàn khi người dùng cuộn đến hoặc nhấn xem */
function setupLazyTableMapSection() {
  const section = document.getElementById('table-map-section');
  let loaded = false;
  const triggerLoad = () => {
    if (loaded) return;
    loaded = true;
    initTableMapSection();
  };

  const navTablesBtn = document.querySelector('#btn-nav-tables');
  if (navTablesBtn) navTablesBtn.addEventListener('click', triggerLoad, { once: true });
  const mobTablesBtn = document.querySelector('#btn-mobile-tables');
  if (mobTablesBtn) mobTablesBtn.addEventListener('click', triggerLoad, { once: true });

  if (section && typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        triggerLoad();
        observer.disconnect();
      }
    }, { rootMargin: '400px' });
    observer.observe(section);
  } else if (section) {
    setTimeout(triggerLoad, 1000);
  }
}

/** 6. Con trỏ chuột tương tác thời gian thực cho máy tính (Master Prompt Phần 2) */
function initCustomCursor() {
  if (document.__customCursorInitialized) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.__customCursorInitialized = true;

  let dot = document.getElementById('custom-cursor-dot');
  let ring = document.getElementById('custom-cursor-ring');
  if (!dot) {
    dot = document.createElement('div');
    dot.id = 'custom-cursor-dot';
    dot.className = 'custom-cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
  }
  if (!ring) {
    ring = document.createElement('div');
    ring.id = 'custom-cursor-ring';
    ring.className = 'custom-cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<span class="cursor-label">Xem món</span>';
    document.body.appendChild(ring);
  }

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let isHovering = false;
  let isDish = false;
  let isVisible = false;
  let isFirstMove = true;
  let rafId = null;

  function loop() {
    ringX += (mouseX - ringX) * 0.22;
    ringY += (mouseY - ringY) * 0.22;

    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;

    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  const handlePointer = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (isFirstMove) {
      isFirstMove = false;
      ringX = mouseX;
      ringY = mouseY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;
    }

    if (!isVisible) {
      isVisible = true;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }

    startLoop();
  };

  window.addEventListener('pointermove', handlePointer, { passive: true });
  window.addEventListener('mousemove', handlePointer, { passive: true });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', (e) => {
    isVisible = true;
    dot.style.opacity = '1';
    ring.style.opacity = '1';
    if (e && typeof e.clientX === 'number' && e.clientX > 0) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (isFirstMove) {
        isFirstMove = false;
        ringX = mouseX;
        ringY = mouseY;
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;
      }
    }
    startLoop();
  });

  document.addEventListener('mouseover', (e) => {
    const dish = e.target.closest('.card-hover, .hero__dish-frame, .family-meal-dish-card, [data-dish-id]');
    if (dish) {
      isDish = true;
      ring.classList.add('cursor-dish');
      ring.classList.remove('cursor-hover');
      return;
    }

    const interactive = e.target.closest('button, a, input, select, textarea, .btn, .status-pill, .hero__badge, [role="button"]');
    if (interactive) {
      isHovering = true;
      ring.classList.add('cursor-hover');
      ring.classList.remove('cursor-dish');
    } else {
      if (isHovering || isDish) {
        ring.classList.remove('cursor-hover', 'cursor-dish');
        isHovering = false;
        isDish = false;
      }
    }
  }, { passive: true });
}

/** 7. Nút nam châm hút nhẹ theo con trỏ chuột (Master Prompt Phần 2.2) */
function initMagneticButtons() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const btns = document.querySelectorAll('.btn-hero-primary, .btn-hero-secondary, .btn-magnetic');
  btns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.22;
      const dy = (e.clientY - cy) * 0.22;
      btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate3d(0, 0, 0)';
    });
  });
}

/** 8. Hiệu ứng chiều sâu 3D Tilt trên thẻ món ăn (Master Prompt Phần 2.3 & 5.3) */
function initInteractiveTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.card-hover');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = -((y - cy) / cy) * 4.5;
    const ry = ((x - cx) / cx) * 4.5;

    card.style.transform = `translateY(-4px) perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.card-hover');
    if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
      card.style.transform = '';
    }
  }, { passive: true });
}
