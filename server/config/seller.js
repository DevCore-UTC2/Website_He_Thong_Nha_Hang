/**
 * CẤU HÌNH NGƯỜI BÁN — VỊ NHÀ MÌNH
 * ============================================================
 * ⚠️  DỮ LIỆU DEMO — KHÔNG PHẢI THÔNG TIN PHÁP LÝ THẬT
 * ============================================================
 * Muốn thay đổi thông tin: sửa .env, KHÔNG sửa file này.
 * Khi IS_DEMO_SELLER=false và thiếu config → server sẽ in cảnh báo.
 *
 * [CẦN XÁC NHẬN VỚI KẾ TOÁN]: mẫu số, ký hiệu hóa đơn
 */

const IS_DEMO = process.env.IS_DEMO_SELLER !== 'false'; // mặc định true

const seller = {
  // ——— Cờ DEMO ———
  isDemo: IS_DEMO,

  // ——— Thông tin người bán ———
  displayName:  process.env.SELLER_DISPLAY_NAME  || 'Vị Nhà Mình',
  invoiceName:  process.env.SELLER_INVOICE_NAME  || (IS_DEMO ? 'NHÀ HÀNG VỊ NHÀ MÌNH (DEMO)' : ''),
  taxId:        process.env.SELLER_TAX_ID        || (IS_DEMO ? '0000000000' : ''), // MST DEMO
  address:      process.env.SELLER_ADDRESS       ||
    '450 Lê Văn Việt, Phường Tăng Nhơn Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
  phone:        process.env.SELLER_PHONE         || (IS_DEMO ? '0900 000 000' : ''),
  email:        process.env.SELLER_EMAIL         || (IS_DEMO ? 'lienhe@vinhaminh.vn' : ''),

  // ——— Tài khoản ngân hàng ———
  // Không hiển thị trong bản DEMO
  bankAccount:  IS_DEMO ? null : (process.env.SELLER_BANK_ACCOUNT || null),
  bankName:     IS_DEMO ? null : (process.env.SELLER_BANK_NAME    || null),

  // ——— Hóa đơn điện tử ———
  // [CẦN XÁC NHẬN VỚI KẾ TOÁN] trước khi phát hành thật
  invoiceTemplate: process.env.INVOICE_TEMPLATE || '1',          // mẫu số 1
  invoiceSerial:   process.env.INVOICE_SERIAL   || 'C26MDM',     // ký hiệu C26MDM (DEMO)

  // ——— Nhà cung cấp hóa đơn điện tử ———
  // Để trống = chưa kết nối = chỉ phát hành hóa đơn DEMO
  eInvoiceProvider: process.env.EINVOICE_PROVIDER || null, // 'vnpt' | 'viettel' | 'misa' | null
};

// Kiểm tra config tối thiểu khi chạy production
if (process.env.NODE_ENV === 'production' && !IS_DEMO) {
  const required = ['SELLER_INVOICE_NAME', 'SELLER_TAX_ID', 'SELLER_ADDRESS', 'SELLER_PHONE'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('❌ [seller.js] Thiếu cấu hình người bán:', missing.join(', '));
    console.error('   Hãy điền vào .env hoặc đặt IS_DEMO_SELLER=true để dùng bản DEMO.');
  }
}

module.exports = seller;
