/**
 * CART SERVICE — VỊ NHÀ MÌNH
 * Mục 5: Quản lý giỏ hàng phân tách nghiêm ngặt theo tài khoản, đồng bộ đa tab và máy chủ
 * - Khách vãng lai: lưu riêng trong vnm_cart_guest
 * - Customer: lưu riêng theo ID tài khoản (vnm_cart_user_{id}) và đồng bộ với CSDL
 * - Staff / Admin: giỏ hàng độc lập, KHÔNG gộp và không nhận giỏ hàng của khách
 */

import { api } from './api.js';
import { authService } from './auth.js';

let syncDebounceTimer = null;

function getActiveCartKey() {
  const user = authService.getCurrentUser();
  if (!user || !user.id) {
    return 'vnm_cart_guest';
  }
  return `vnm_cart_user_${user.id}`;
}

export const cartService = {
  getActiveKey() {
    return getActiveCartKey();
  },

  getItems() {
    try {
      const key = getActiveCartKey();
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);

      // Tương thích ngược phiên bản cũ nếu đang ở giỏ guest
      if (key === 'vnm_cart_guest') {
        const legacy = localStorage.getItem('vinhaminh_cart') || localStorage.getItem('smartbite_cart');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          localStorage.setItem('vnm_cart_guest', JSON.stringify(parsed));
          localStorage.removeItem('vinhaminh_cart');
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    const key = getActiveCartKey();
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:change', { detail: items }));

    // Tự động đồng bộ lên máy chủ với Debounce 400ms nếu là tài khoản đã đăng nhập
    const user = authService.getCurrentUser();
    if (user && authService.isAuthenticated()) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        api.post('/cart/sync', { items }).catch((err) => {
          if (err && err.status === 401) {
            // Phiên đăng nhập hết hạn
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
        });
      }, 400);
    }
  },

  addItem(newItem) {
    const items = this.getItems();

    // So sánh xem đã có món tương tự (cùng món, cùng cấp độ cay, cùng danh sách topping, cùng ghi chú) chưa
    const existingIndex = items.findIndex(item => 
      item.dish_id === newItem.dish_id &&
      item.spice_level === newItem.spice_level &&
      (item.note || '') === (newItem.note || '') &&
      JSON.stringify([...(item.selected_toppings || [])].sort((a, b) => (a.id || 0) - (b.id || 0))) === 
      JSON.stringify([...(newItem.selected_toppings || [])].sort((a, b) => (a.id || 0) - (b.id || 0)))
    );

    if (existingIndex > -1) {
      items[existingIndex].quantity = Math.min(items[existingIndex].quantity + (newItem.quantity || 1), 99);
    } else {
      items.push({
        id: Date.now() + Math.random(),
        ...newItem,
        quantity: Math.max(1, Math.min(newItem.quantity || 1, 99))
      });
    }

    this.saveItems(items);
  },

  updateQuantity(itemId, delta) {
    let items = this.getItems();
    const index = items.findIndex(item => item.id === itemId);

    if (index > -1) {
      items[index].quantity += delta;
      if (items[index].quantity <= 0) {
        items.splice(index, 1);
      } else if (items[index].quantity > 99) {
        items[index].quantity = 99;
      }
      this.saveItems(items);
    }
  },

  removeItem(itemId) {
    let items = this.getItems();
    items = items.filter(item => item.id !== itemId);
    this.saveItems(items);
  },

  clearCart() {
    this.saveItems([]);
  },

  getItemCount() {
    const items = this.getItems();
    return items.reduce((total, item) => total + item.quantity, 0);
  },

  getSubtotal() {
    const items = this.getItems();
    return items.reduce((total, item) => {
      // Giá cơ sở của món + tổng giá topping
      const toppingSum = (item.selected_toppings || []).reduce((sum, t) => sum + (t.price || 0), 0);
      const itemUnitPrice = (item.dish_price || item.unit_price || 0) + toppingSum;
      return total + (itemUnitPrice * item.quantity);
    }, 0);
  },

  /** Xử lý chuyển đổi tài khoản khi Đăng nhập / Đăng xuất (Mục 3) */
  async handleAuthTransition(newUser, prevUser) {
    if (newUser) {
      // Người dùng vừa đăng nhập
      if (newUser.role === 'customer') {
        // Chỉ Customer được gộp giỏ hàng guest
        let guestItems = [];
        try {
          const rawGuest = localStorage.getItem('vnm_cart_guest');
          guestItems = rawGuest ? JSON.parse(rawGuest) : [];
        } catch (_) {}

        // Lấy giỏ hàng đã lưu trước đó của tài khoản trên máy chủ
        let serverItems = [];
        try {
          const res = await api.get('/cart');
          if (res && res.data && Array.isArray(res.data.items)) {
            serverItems = res.data.items;
          }
        } catch (_) {}

        // Gộp món từ giỏ guest vào giỏ của khách hàng
        const targetItems = [...serverItems];
        if (guestItems.length > 0) {
          for (const gItem of guestItems) {
            const idx = targetItems.findIndex(it => 
              it.dish_id === gItem.dish_id &&
              it.spice_level === gItem.spice_level &&
              (it.note || '') === (gItem.note || '')
            );
            if (idx > -1) {
              targetItems[idx].quantity = Math.min(targetItems[idx].quantity + (gItem.quantity || 1), 99);
            } else {
              targetItems.push(gItem);
            }
          }
          // Xóa giỏ hàng guest sau khi đã gộp thành công
          localStorage.removeItem('vnm_cart_guest');
        }

        const userKey = `vnm_cart_user_${newUser.id}`;
        localStorage.setItem(userKey, JSON.stringify(targetItems));
        window.dispatchEvent(new CustomEvent('cart:change', { detail: targetItems }));

        // Đồng bộ bản gộp lên máy chủ
        api.post('/cart/sync', { items: targetItems }).catch(() => {});
      } else {
        // Tài khoản Staff hoặc Admin: KHÔNG gộp giỏ khách, giữ giỏ riêng
        const staffKey = `vnm_cart_user_${newUser.id}`;
        let staffItems = [];
        try {
          const raw = localStorage.getItem(staffKey);
          staffItems = raw ? JSON.parse(raw) : [];
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('cart:change', { detail: staffItems }));
      }
    } else {
      // Người dùng đăng xuất -> Chuyển về giỏ khách vãng lai (guest)
      let guestItems = [];
      try {
        const raw = localStorage.getItem('vnm_cart_guest');
        guestItems = raw ? JSON.parse(raw) : [];
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('cart:change', { detail: guestItems }));
    }
  }
};

// Lắng nghe sự kiện đăng nhập / đăng xuất để chuyển đổi giỏ hàng mượt mà
let previousUser = authService.getCurrentUser();
window.addEventListener('auth:change', (e) => {
  const currentUser = e.detail;
  cartService.handleAuthTransition(currentUser, previousUser);
  previousUser = currentUser;
});

// Đồng bộ giỏ hàng thời gian thực giữa các tab trên cùng một trình duyệt
window.addEventListener('storage', (e) => {
  if (e.key === getActiveCartKey()) {
    try {
      const updatedItems = e.newValue ? JSON.parse(e.newValue) : [];
      window.dispatchEvent(new CustomEvent('cart:change', { detail: updatedItems }));
    } catch (_) {}
  }
});
