/**
 * API SERVICE WRAPPER
 * Áp dụng skills: api-design-principles, frontend-developer
 * Xử lý gọi API tập trung, gắn JWT token và bắt lỗi mạng / lỗi phiên
 */

// Tự động nhận diện khi mở qua Live Server (port 5500/5501...) để gọi đúng Backend port 5000
const BASE_URL = (window.location.port && window.location.port !== '5000')
  ? 'http://localhost:5000/api'
  : '/api';

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Tự động đính kèm token nếu đã đăng nhập (T2.2)
  const token = localStorage.getItem('vnm_token') || localStorage.getItem('vinhaminh_token') || localStorage.getItem('smartbite_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    // Xử lý mã lỗi 401: hết phiên đăng nhập
    if (response.status === 401 && token) {
      localStorage.removeItem('vnm_token');
      localStorage.removeItem('vnm_user');
      localStorage.removeItem('vinhaminh_token');
      localStorage.removeItem('vinhaminh_user');
      localStorage.removeItem('smartbite_token');
      localStorage.removeItem('smartbite_user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Lỗi yêu cầu: ${response.status}`);
    }

    return data;
  } catch (error) {
    // Bắt lỗi mất mạng hoặc không kết nối được server
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Mất kết nối máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
    }
    throw error;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' })
};
