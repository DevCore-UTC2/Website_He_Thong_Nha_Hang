/**
 * BASE E-INVOICE PROVIDER ADAPTER — VỊ NHÀ MÌNH
 * Interface tiêu chuẩn cho kết nối các cổng hóa đơn điện tử tại Việt Nam (VNPT, Viettel, MISA, BKAV)
 * Tuân thủ Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC.
 */

class EInvoiceProviderAdapter {
  constructor(config = {}) {
    this.config = config;
    this.name = 'BaseAdapter';
  }

  /**
   * Phát hành hóa đơn điện tử mới
   * @param {object} invoiceData Dữ liệu hóa đơn từ bảng invoices
   * @returns {Promise<{ success: boolean, invoiceNumber: string, serial: string, transactionId: string, signedXml?: string, viewUrl?: string }>}
   */
  async issueInvoice(invoiceData) {
    throw new Error(`[${this.name}] issueInvoice() chưa được cài đặt.`);
  }

  /**
   * Điều chỉnh hóa đơn đã phát hành (sai sót)
   * @param {string} originalInvoiceNumber
   * @param {object} adjustmentData
   * @returns {Promise<{ success: boolean, adjustedInvoiceNumber: string }>}
   */
  async adjustInvoice(originalInvoiceNumber, adjustmentData) {
    throw new Error(`[${this.name}] adjustInvoice() chưa được cài đặt.`);
  }

  /**
   * Hủy hóa đơn điện tử
   * @param {string} invoiceNumber
   * @param {string} cancelReason
   * @returns {Promise<{ success: boolean, cancelledAt: string }>}
   */
  async cancelInvoice(invoiceNumber, cancelReason) {
    throw new Error(`[${this.name}] cancelInvoice() chưa được cài đặt.`);
  }

  /**
   * Lấy file PDF hóa đơn gốc có chữ ký số
   * @param {string} invoiceNumber
   * @returns {Promise<Buffer|string>} Buffer PDF hoặc đường dẫn tải về
   */
  async getInvoicePdf(invoiceNumber) {
    throw new Error(`[${this.name}] getInvoicePdf() chưa được cài đặt.`);
  }

  /**
   * Kiểm tra trạng thái cấp mã cơ quan thuế
   * @param {string} invoiceNumber
   * @returns {Promise<{ status: string, taxAuthorityCode?: string }>}
   */
  async checkTaxAuthorityStatus(invoiceNumber) {
    throw new Error(`[${this.name}] checkTaxAuthorityStatus() chưa được cài đặt.`);
  }
}

module.exports = EInvoiceProviderAdapter;
