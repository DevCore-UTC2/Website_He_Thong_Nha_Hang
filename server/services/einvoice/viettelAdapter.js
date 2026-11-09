/**
 * VIETTEL S-INVOICE ADAPTER STUB — VỊ NHÀ MÌNH
 * Kết nối dịch vụ hóa đơn điện tử Viettel S-Invoice qua REST API JSON
 * 
 * Tài liệu tham khảo:
 * - API endpoint: https://api-sinvoice.viettel.vn/services/sinvoice/
 * - Phương thức chính: POST /createInvoiceDraft, POST /createInvoiceWithToken
 * 
 * Cấu hình cần thiết trong .env:
 * - VIETTEL_INVOICE_URL: URL API Viettel S-Invoice
 * - VIETTEL_INVOICE_APP_ID: ID ứng dụng doanh nghiệp
 * - VIETTEL_INVOICE_USERNAME: Tài khoản API
 * - VIETTEL_INVOICE_PASSWORD: Mật khẩu API
 */

const EInvoiceProviderAdapter = require('./providerAdapter');

class ViettelInvoiceAdapter extends EInvoiceProviderAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'ViettelInvoiceAdapter';
    this.apiUrl = config.apiUrl || process.env.VIETTEL_INVOICE_URL;
    this.username = config.username || process.env.VIETTEL_INVOICE_USERNAME;
    this.password = config.password || process.env.VIETTEL_INVOICE_PASSWORD;
  }

  buildViettelPayload(invoiceData) {
    const items = typeof invoiceData.items_snapshot === 'string' 
      ? JSON.parse(invoiceData.items_snapshot) 
      : (invoiceData.items_snapshot || []);

    return {
      generalInvoiceInfo: {
        invoiceType: '1',
        templateCode: invoiceData.template_code || '1',
        invoiceSeries: invoiceData.serial_code || 'C26TVT',
        currencyCode: 'VND',
        adjustmentType: '1',
        paymentMethod: invoiceData.payment_method
      },
      buyerInfo: {
        buyerName: invoiceData.buyer_name,
        buyerTaxCode: invoiceData.buyer_tax_id || '',
        buyerAddress: invoiceData.buyer_address || '',
        buyerPhoneNumber: invoiceData.buyer_phone || '',
        buyerEmail: invoiceData.buyer_email || ''
      },
      itemInfo: items.map((it, idx) => ({
        lineNumber: idx + 1,
        itemCode: String(it.dish_id),
        itemName: it.dish_name,
        unitName: 'Phần',
        quantity: it.quantity,
        unitPrice: it.unit_price,
        taxPercentage: Math.round((it.vat_rate || 0.08) * 100),
        taxAmount: it.vat_amount,
        totalAmountWithTax: it.item_total
      })),
      taxSummary: [
        {
          taxPercentage: 8,
          taxAmount: invoiceData.vat_8_amount
        },
        {
          taxPercentage: 10,
          taxAmount: invoiceData.vat_10_amount
        }
      ],
      totalAmountWithTax: invoiceData.total_amount,
      totalAmountWithTaxInWords: invoiceData.total_amount_in_words
    };
  }

  async issueInvoice(invoiceData) {
    if (!this.apiUrl || !this.username) {
      console.warn('⚠️ [ViettelInvoiceAdapter] Chưa cấu hình thông tin kết nối Viettel S-Invoice. Hoạt động ở chế độ Stub.');
      return {
        success: false,
        provider: 'VIETTEL',
        message: 'Chưa cấu hình thông tin Viettel S-Invoice trong .env.',
        stubPayload: this.buildViettelPayload(invoiceData)
      };
    }
    throw new Error('[ViettelInvoiceAdapter] Cần hoàn thiện tích hợp khi ký hợp đồng chính thức với Viettel.');
  }

  async adjustInvoice(originalInvoiceNumber, adjustmentData) {
    throw new Error('[ViettelInvoiceAdapter] adjustInvoice() chưa được kích hoạt.');
  }

  async cancelInvoice(invoiceNumber, cancelReason) {
    throw new Error('[ViettelInvoiceAdapter] cancelInvoice() chưa được kích hoạt.');
  }

  async getInvoicePdf(invoiceNumber) {
    throw new Error('[ViettelInvoiceAdapter] getInvoicePdf() chưa được kích hoạt.');
  }

  async checkTaxAuthorityStatus(invoiceNumber) {
    return {
      status: 'PENDING_CONFIG',
      message: 'Chưa kết nối môi trường Viettel thật.'
    };
  }
}

module.exports = ViettelInvoiceAdapter;
