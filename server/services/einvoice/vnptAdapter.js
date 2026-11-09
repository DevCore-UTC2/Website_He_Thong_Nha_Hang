/**
 * VNPT-INVOICE ADAPTER STUB — VỊ NHÀ MÌNH
 * Kết nối dịch vụ hóa đơn điện tử VNPT Invoice qua Web Service / REST API
 * 
 * Tài liệu tham khảo:
 * - API endpoint: https://<domain-vnpt>/PublishService.asmx
 * - Phương thức chính: ImportAndParseInv, PublishInvWithToken
 * 
 * Cấu hình cần thiết trong .env:
 * - VNPT_INVOICE_URL: URL cổng dịch vụ VNPT
 * - VNPT_INVOICE_USER: Tên tài khoản dịch vụ Web Service
 * - VNPT_INVOICE_PASS: Mật khẩu dịch vụ Web Service
 * - VNPT_INVOICE_ACCOUNT: Tài khoản phát hành
 * - VNPT_INVOICE_ACCPASS: Mật khẩu phát hành
 * - VNPT_SERIAL: Ký hiệu mẫu hóa đơn (ví dụ: C26TVN)
 */

const EInvoiceProviderAdapter = require('./providerAdapter');

class VnptInvoiceAdapter extends EInvoiceProviderAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'VnptInvoiceAdapter';
    this.apiUrl = config.apiUrl || process.env.VNPT_INVOICE_URL;
    this.username = config.username || process.env.VNPT_INVOICE_USER;
    this.password = config.password || process.env.VNPT_INVOICE_PASS;
  }

  /**
   * Chuyển đổi dữ liệu đơn hàng sang cấu trúc XML của VNPT
   */
  buildVnptXmlPayload(invoiceData) {
    const items = typeof invoiceData.items_snapshot === 'string' 
      ? JSON.parse(invoiceData.items_snapshot) 
      : (invoiceData.items_snapshot || []);

    const xmlItems = items.map((it, idx) => `
      <Product>
        <Code>${it.dish_id}</Code>
        <ProdName><![CDATA[${it.dish_name}]]></ProdName>
        <ProdUnit>Phần</ProdUnit>
        <ProdQuantity>${it.quantity}</ProdQuantity>
        <ProdPrice>${it.unit_price}</ProdPrice>
        <Amount>${it.item_total}</Amount>
        <VATRate>${Math.round((it.vat_rate || 0.08) * 100)}</VATRate>
        <VATAmount>${it.vat_amount}</VATAmount>
        <Total>${it.item_total}</Total>
      </Product>
    `).join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<Invoices>
  <Inv>
    <Invoice>
      <CusCode>${invoiceData.buyer_phone || invoiceData.order_code}</CusCode>
      <CusName><![CDATA[${invoiceData.buyer_name}]]></CusName>
      <CusAddress><![CDATA[${invoiceData.buyer_address || ''}]]></CusAddress>
      <CusPhone>${invoiceData.buyer_phone || ''}</CusPhone>
      <CusTaxCode>${invoiceData.buyer_tax_id || ''}</CusTaxCode>
      <PaymentMethod>${invoiceData.payment_method}</PaymentMethod>
      <Total>${invoiceData.total_before_vat}</Total>
      <VATAmount>${invoiceData.total_vat}</VATAmount>
      <Amount>${invoiceData.total_amount}</Amount>
      <AmountInWords><![CDATA[${invoiceData.total_amount_in_words}]]></AmountInWords>
      <Products>
        ${xmlItems}
      </Products>
    </Invoice>
  </Inv>
</Invoices>`;
  }

  async issueInvoice(invoiceData) {
    if (!this.apiUrl || !this.username) {
      // Khi chưa cấu hình thông tin thật, ghi log và trả về trạng thái stub
      console.warn('⚠️ [VnptInvoiceAdapter] Chưa cấu hình thông tin kết nối VNPT Invoice. Hoạt động ở chế độ Stub.');
      return {
        success: false,
        provider: 'VNPT',
        message: 'Chưa cấu hình tài khoản VNPT Invoice trong .env (VNPT_INVOICE_URL, VNPT_INVOICE_USER).',
        stubPayload: this.buildVnptXmlPayload(invoiceData)
      };
    }

    // TODO: Tích hợp gọi HTTP SOAP/REST sang VNPT PublishService
    throw new Error('[VnptInvoiceAdapter] Cần hoàn thiện tích hợp khi ký hợp đồng chính thức với VNPT.');
  }

  async adjustInvoice(originalInvoiceNumber, adjustmentData) {
    throw new Error('[VnptInvoiceAdapter] Phương thức điều chỉnh hóa đơn VNPT chưa được kích hoạt.');
  }

  async cancelInvoice(invoiceNumber, cancelReason) {
    throw new Error('[VnptInvoiceAdapter] Phương thức hủy hóa đơn VNPT chưa được kích hoạt.');
  }

  async getInvoicePdf(invoiceNumber) {
    throw new Error('[VnptInvoiceAdapter] Phương thức tải PDF hóa đơn VNPT chưa được kích hoạt.');
  }

  async checkTaxAuthorityStatus(invoiceNumber) {
    return {
      status: 'PENDING_CONFIG',
      message: 'Chưa kết nối môi trường VNPT thật.'
    };
  }
}

module.exports = VnptInvoiceAdapter;
