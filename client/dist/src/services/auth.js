/**
 * AUTH SERVICE — VỊ NHÀ MÌNH
 * Quản lý phiên, xác thực người dùng, kiểm tra SĐT
 */

import { api } from './api.js';

const TOKEN_KEY = 'vnm_token';
const USER_KEY = 'vnm_user';

export const authService = {
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem(USER_KEY) || localStorage.getItem('smartbite_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('smartbite_token');
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      window.dispatchEvent(new CustomEvent('auth:change', { detail: res.data.user }));
    }
    return res;
  },

  async register(name, email, password, phone, dialCode = '+84', consent = true) {
    const res = await api.post('/auth/register', { 
      name, 
      email, 
      password, 
      phone, 
      dial_code: dialCode, 
      consent 
    });
    if (res.success && res.data) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      window.dispatchEvent(new CustomEvent('auth:change', { detail: res.data.user }));
    }
    return res;
  },

  async checkPhone(phone, dialCode = '+84') {
    return await api.get(`/auth/check-phone?phone=${encodeURIComponent(phone)}&dial_code=${encodeURIComponent(dialCode)}`);
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('smartbite_token');
    localStorage.removeItem('smartbite_user');
    window.dispatchEvent(new CustomEvent('auth:change', { detail: null }));
  }
};
