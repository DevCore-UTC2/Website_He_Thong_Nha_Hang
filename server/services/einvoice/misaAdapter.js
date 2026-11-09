/**
 * MISA MEINVOICE ADAPTER STUB — VỊ NHÀ MÌNH
 * Kết nối dịch vụ hóa đơn điện tử MISA meInvoice qua REST API JSON
 * 
 * Tài liệu tham khảo:
 * - API endpoint: https://api.meinvoice.vn/api/v1/invoice/publish
 * - Đăng ký app và lấy app-id từ trang nhà phát triển MISA
 * 
 * Cấu hình cần thiết trong .env:
 * - MISA_INVOICE_URL: URL API MISA meInvoice
 * - MISA_APP_ID: ID ứng dụng MISA cấp
 * - MISA_TAX_CODE: MST đơn vị phát hành
 * - MISA_TOKEN: Mã Bearer Token xác thực
 */

const EInvoiceProviderAdapter = require('./providerAdapter');

class MisaInvoiceAdapter extends EInvoiceProviderAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'MisaInvoiceAdapter';
    this.apiUrl = config.apiUrl || process.env.MISA_INVOICE_URL;
    this.appId = config.appId || process.env.MISA_APP_ID;
    this.taxCode = config.taxCode || process.env.MISA_TAX_CODE;
    this.token = config.token || process.env.MISA_TOKEN;
  }

  buildMisaPayload(invoiceData) {
    const items = typeof invoiceData.items_snapshot === 'string' 
      ? JSON.parse(invoiceData.items_snapshot) 
      : (invoiceData.items_snapshot || []);

    return {
      RefID: invoiceData.order_code,
      InvSeries: invoiceData.serial_code || 'C26MMI',
      InvDate: new Date().toISOString().split('T')[0],
      CurrencyCode: 'VND',
      ExchangeRate: 1,
      BuyerLegalName: invoiceData.buyer_company_name || invoiceData.buyer_name,
      BuyerTaxCode: invoiceData.buyer_tax_id || '',
      BuyerAddress: invoiceData.buyer_address || '',
      BuyerPhoneNumber: invoiceData.buyer_phone || '',
      BuyerEmail: invoiceData.buyer_email || '',
      PaymentMethod: invoiceData.payment_method,
      OriginalInvoiceDetail: items.map((it, idx) => ({
        SortOrder: idx + 1,
        ItemCode: String(it.dish_id),
        ItemName: it.dish_name,
        UnitName: 'Phần',
        Quantity: it.quantity,
        UnitPrice: it.unit_price,
        VATRateName: `${Math.round((it.vat_rate || 0.08) * 100)}%`,
        VATAmount: it.vat_amount,
        Amount: it.item_total
      })),
      TotalAmountWithoutVAT: invoiceData.total_before_vat,
      TotalVATAmount: invoiceData.total_vat,
      TotalAmount: invoiceData.total_amount,
      TotalAmountInWords: invoiceData.total_amount_in_words
    };
  }

  async issueInvoice(invoiceData) {
    if (!this.apiUrl || !this.appId) {
      console.warn('⚠️ [MisaInvoiceAdapter] Chưa cấu hình thông tin kết nối MISA meInvoice. Hoạt động ở chế độ Stub.');
      return {
        success: false,
        provider: 'MISA',
        message: 'Chưa cấu hình thông tin MISA meInvoice trong .env.',
        stubPayload: this.buildMisaPayload(invoiceData)
      };
    }
    throw new Error('[MisaInvoiceAdapter] Cần hoàn thiện tích hợp khi ký hợp đồng chính thức với MISA.');
  }

  async adjustInvoice(originalInvoiceNumber, adjustmentData) {
    throw new Error('[MisaInvoiceAdapter] adjustInvoice() chưa được kích hoạt.');
  }

  async cancelInvoice(invoiceNumber, cancelReason) {
    throw new Error('[MisaInvoiceAdapter] cancelInvoice() chưa được kích hoạt.');
  }

  async getInvoicePdf(invoiceNumber) {
    throw new Error('[MisaInvoiceAdapter] getInvoicePdf() chưa được kích hoạt.');
  }

  async checkTaxAuthorityStatus(invoiceNumber) {
    return {
      status: 'PENDING_CONFIG',
      message: 'Chưa kết nối môi trường MISA thật.'
    };
  }
}

module.exports = MisaInvoiceAdapter;
