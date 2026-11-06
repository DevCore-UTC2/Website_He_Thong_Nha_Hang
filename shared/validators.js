/**
 * SHARED VALIDATORS — VỊ NHÀ MÌNH
 * Dùng chung giữa Client & Server (Node 26 native ESM + Browser ESM)
 * Hỗ trợ chuẩn hóa SĐT E.164, đo độ mạnh mật khẩu, kiểm tra email và họ tên.
 */

/** Danh sách 15 quốc gia phổ biến cho bộ chọn mã vùng điện thoại */
export const COUNTRY_CALLING_CODES = [
  { code: 'VN', dial: '+84', name: 'Việt Nam' },
  { code: 'US', dial: '+1',  name: 'Mỹ / Canada' },
  { code: 'KR', dial: '+82', name: 'Hàn Quốc' },
  { code: 'JP', dial: '+81', name: 'Nhật Bản' },
  { code: 'SG', dial: '+65', name: 'Singapore' },
  { code: 'AU', dial: '+61', name: 'Úc' },
  { code: 'GB', dial: '+44', name: 'Vương quốc Anh' },
  { code: 'FR', dial: '+33', name: 'Pháp' },
  { code: 'DE', dial: '+49', name: 'Đức' },
  { code: 'TH', dial: '+66', name: 'Thái Lan' },
  { code: 'MY', dial: '+60', name: 'Malaysia' },
  { code: 'ID', dial: '+62', name: 'Indonesia' },
  { code: 'PH', dial: '+63', name: 'Philippines' },
  { code: 'TW', dial: '+886', name: 'Đài Loan' },
  { code: 'CN', dial: '+86', name: 'Trung Quốc' },
];

/**
 * Chuẩn hóa số điện thoại sang định dạng chuẩn quốc tế E.164
 * @param {string} rawPhone - Số điện thoại người dùng nhập
 * @param {string} defaultDialCode - Mã quốc gia mặc định (mặc định: +84)
 * @returns {string|null} Chuỗi E.164 (VD: '+84901234567') hoặc null nếu không hợp lệ
 */
export function normalizePhoneE164(rawPhone, defaultDialCode = '+84') {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  let cleaned = rawPhone.trim().replace(/[\s\-.()]/g, '');
  if (!cleaned) return null;

  // Nếu người dùng nhập đầu số 0 (VD: 0901234567)
  if (cleaned.startsWith('0')) {
    cleaned = defaultDialCode + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    // Nếu bắt đầu bằng 84 không có dấu +
    if (cleaned.startsWith('84') && cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = defaultDialCode + cleaned;
    }
  }

  return isValidPhoneE164(cleaned) ? cleaned : null;
}

/**
 * Kiểm tra tính hợp lệ của số điện thoại E.164
 * @param {string} e164Phone
 * @returns {boolean}
 */
export function isValidPhoneE164(e164Phone) {
  if (!e164Phone || typeof e164Phone !== 'string') return false;

  // Định dạng E.164 chung: dấu + và 8 đến 15 chữ số
  const generalRegex = /^\+[1-9]\d{7,14}$/;
  if (!generalRegex.test(e164Phone)) return false;

  // Nếu là số điện thoại Việt Nam (+84), kiểm tra chặt theo quy chuẩn 10 chữ số (đầu số 3, 5, 7, 8, 9)
  if (e164Phone.startsWith('+84')) {
    return /^\+84(3|5|7|8|9)\d{8}$/.test(e164Phone);
  }

  return true;
}

/**
 * Kiểm tra định dạng Email hợp lệ
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 100) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed);
}

/**
 * Đánh giá độ mạnh mật khẩu và kiểm tra tính hợp lệ
 * @param {string} password
 * @returns {{ isValid: boolean, score: number, label: string, message: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, score: 0, label: 'Trống', message: 'Vui lòng nhập mật khẩu.' };
  }

  if (password.length < 8) {
    return { isValid: false, score: 0, label: 'Quá ngắn', message: 'Mật khẩu phải dài ít nhất 8 ký tự.' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  if (!hasLetter || !hasDigit) {
    return { isValid: false, score: 0, label: 'Thiếu ký tự', message: 'Mật khẩu phải bao gồm cả chữ cái và chữ số.' };
  }

  // Tính điểm độ mạnh: 1 (Yếu), 2 (Trung bình), 3 (Mạnh)
  let score = 1;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (password.length >= 10 && hasUpper && hasLower && hasDigit) {
    score = 2;
  }
  if (password.length >= 12 && hasUpper && hasLower && hasDigit && hasSpecial) {
    score = 3;
  }

  const labels = ['', 'Yếu', 'Trung bình', 'Mạnh'];
  return {
    isValid: true,
    score,
    label: labels[score],
    message: 'Mật khẩu hợp lệ.'
  };
}

/**
 * Kiểm tra họ và tên hợp lệ (chữ cái Unicode tiếng Việt, không chứa số)
 * @param {string} name
 * @returns {boolean}
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  // Cho phép chữ cái Unicode tiếng Việt, dấu cách, dấu nháy đơn, dấu gạch ngang
  const regex = /^[\p{L}\s'.-]+$/u;
  return regex.test(trimmed);
}

/**
 * Kiểm tra tính hợp lệ của Mã số thuế (MST) doanh nghiệp Việt Nam
 * Hỗ trợ: 10 chữ số (doanh nghiệp) hoặc 13 chữ số (chi nhánh: 10 số + '-' + 3 số)
 * Kiểm tra chữ số kiểm tra (check digit) Modulo 11 với trọng số [31, 29, 23, 19, 17, 13, 7, 5, 3].
 * MST Demo '0000000000' được miễn kiểm tra checksum.
 * @param {string} taxId
 * @returns {boolean}
 */
export function isValidTaxId(taxId) {
  if (!taxId || typeof taxId !== 'string') return false;
  const clean = taxId.trim();

  // Cho phép MST người bán DEMO
  if (clean === '0000000000') return true;

  // Định dạng chuẩn: 10 số hoặc 13 số có gạch nối
  const match = clean.match(/^(\d{10})(-(\d{3}))?$/);
  if (!match) return false;

  const d = match[1].split('').map(Number);
  const weights = [31, 29, 23, 19, 17, 13, 7, 5, 3];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += d[i] * weights[i];
  }

  const remainder = sum % 11;
  const expectedCheck = 10 - remainder;
  const checkDigit = expectedCheck === 10 ? 0 : expectedCheck;

  return checkDigit === d[9];
}

/** Cấu hình các loại hình tiệc và thời lượng phục vụ (Mục 4) */
export const PARTY_TYPES_CONFIG = {
  normal: {
    key: 'normal',
    name: 'Ăn uống thông thường',
    duration_minutes: 120, // 2 giờ
    min_guests: 1,
    max_guests: 50
  },
  family: {
    key: 'family',
    name: 'Tiệc gia đình sum vầy',
    duration_minutes: 150, // 2.5 giờ
    min_guests: 2,
    max_guests: 50
  },
  birthday: {
    key: 'birthday',
    name: 'Tiệc sinh nhật',
    duration_minutes: 180, // 3 giờ
    min_guests: 4,
    max_guests: 50
  },
  corporate: {
    key: 'corporate',
    name: 'Tiệc công ty / Hội họp',
    duration_minutes: 180, // 3 giờ
    min_guests: 6,
    max_guests: 50
  },
  wedding: {
    key: 'wedding',
    name: 'Tiệc kỷ niệm / Đám hỏi',
    duration_minutes: 240, // 4 giờ
    min_guests: 10,
    max_guests: 50
  }
};

/** Cấu hình quy chuẩn giờ nhận đặt bàn (Mục 4) */
export const RESERVATION_HOURS_CONFIG = {
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  OPEN_HOUR: 9,              // 09:00
  LAST_RESERVATION_HOUR: 21, // 21:00 (đặt muộn nhất trước giờ đóng cửa 1 tiếng)
  CLOSE_HOUR: 22,            // 22:00
  MIN_LEAD_HOURS: 1,         // Đặt trước ít nhất 1 giờ
  MAX_DAYS_AHEAD: 30         // Đặt trước tối đa 30 ngày
};

/**
 * Kiểm tra tính hợp lệ của thời gian đặt bàn / tiệc (Mục 4)
 * Hoạt động độc lập múi giờ máy chủ, luôn quy đổi chuẩn sang Asia/Ho_Chi_Minh
 * @param {string|Date} reservationTime
 * @param {Date} [referenceDate]
 * @returns {{ isValid: boolean, message?: string, date?: Date, hour?: number, minute?: number }}
 */
export function validateReservationTime(reservationTime, referenceDate = new Date()) {
  if (!reservationTime) {
    return { isValid: false, message: 'Vui lòng chọn thời gian đặt bàn.' };
  }

  const resDate = new Date(reservationTime);
  if (isNaN(resDate.getTime())) {
    return { isValid: false, message: 'Định dạng thời gian đặt bàn không hợp lệ.' };
  }

  const now = referenceDate;
  const diffMs = resDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { isValid: false, message: 'Thời gian đặt bàn phải ở tương lai.' };
  }

  // Đặt trước ít nhất 1 giờ
  const minLeadMs = RESERVATION_HOURS_CONFIG.MIN_LEAD_HOURS * 60 * 60 * 1000;
  if (diffMs < minLeadMs - 60000) { // du di 1 phút do network trễ
    return { 
      isValid: false, 
      message: 'Quý khách vui lòng đặt bàn trước ít nhất 1 giờ để nhà hàng chuẩn bị chu đáo.' 
    };
  }

  // Đặt trước tối đa 30 ngày
  const maxAheadMs = RESERVATION_HOURS_CONFIG.MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  if (diffMs > maxAheadMs) {
    return { 
      isValid: false, 
      message: 'Nhà hàng chỉ nhận đặt bàn trước tối đa 30 ngày.' 
    };
  }

  // Lấy giờ và phút theo múi giờ Việt Nam
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESERVATION_HOURS_CONFIG.TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(resDate);

  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  // Khung giờ hợp lệ: từ 09:00 đến 21:00
  if (hour < RESERVATION_HOURS_CONFIG.OPEN_HOUR || 
      (hour === RESERVATION_HOURS_CONFIG.LAST_RESERVATION_HOUR && minute > 0) || 
      hour > RESERVATION_HOURS_CONFIG.LAST_RESERVATION_HOUR) {
    return {
      isValid: false,
      message: 'Khung giờ đặt bàn nhận khách từ 09:00 đến 21:00 (nhà hàng đóng cửa lúc 22:00).'
    };
  }

  return {
    isValid: true,
    date: resDate,
    hour,
    minute
  };
}
