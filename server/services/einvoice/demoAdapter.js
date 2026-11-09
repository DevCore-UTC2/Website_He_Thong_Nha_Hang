/**
 * DEMO E-INVOICE PROVIDER ADAPTER — VỊ NHÀ MÌNH
 * Mô phỏng phát hành hóa đơn nội bộ (không gửi cơ quan thuế thật)
 */

const EInvoiceProviderAdapter = require('./providerAdapter');

class DemoInvoiceAdapter extends EInvoiceProviderAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'DemoInvoiceAdapter';
  }

  async issueInvoice(invoiceData) {
    const formattedNum = String(invoiceData.invoice_number).padStart(8, '0');
    return {
      success: true,
      provider: 'DEMO',
      invoiceNumber: formattedNum,
      serial: invoiceData.serial_code || 'C26MDM',
      transactionId: `TX-DEMO-${Date.now()}`,
      issuedAt: new Date().toISOString(),
      watermark: 'HÓA ĐƠN DEMO – KHÔNG CÓ GIÁ TRỊ PHÁP LÝ',
      message: 'Hóa đơn giả lập đã được tạo thành công trong hệ thống thử nghiệm.'
    };
  }

  async adjustInvoice(originalInvoiceNumber, adjustmentData) {
    return {
      success: true,
      provider: 'DEMO',
      adjustedInvoiceNumber: String(adjustmentData.new_number || originalInvoiceNumber).padStart(8, '0'),
      adjustedAt: new Date().toISOString(),
      message: 'Đã tạo hóa đơn điều chỉnh giả lập.'
    };
  }

  async cancelInvoice(invoiceNumber, cancelReason) {
    return {
      success: true,
      provider: 'DEMO',
      invoiceNumber: String(invoiceNumber).padStart(8, '0'),
      cancelledAt: new Date().toISOString(),
      reason: cancelReason,
      message: 'Đã hủy hóa đơn giả lập.'
    };
  }

  async getInvoicePdf(invoiceNumber) {
    return `/hoa-don.html?number=${invoiceNumber}`;
  }

  async checkTaxAuthorityStatus(invoiceNumber) {
    return {
      status: 'DEMO_APPROVED',
      taxAuthorityCode: `TAX-DEMO-${invoiceNumber}-${Date.now().toString().slice(-6)}`,
      message: 'Mã cơ quan thuế giả lập (Dành cho kiểm thử môi trường Sandbox).'
    };
  }
}

module.exports = DemoInvoiceAdapter;
