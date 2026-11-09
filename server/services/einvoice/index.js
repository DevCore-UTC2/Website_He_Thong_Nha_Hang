/**
 * E-INVOICE FACTORY — VỊ NHÀ MÌNH
 * Cung cấp adapter hóa đơn điện tử dựa trên cấu hình môi trường (seller.eInvoiceProvider hoặc process.env.EINVOICE_PROVIDER)
 */

const seller = require('../../config/seller');
const DemoInvoiceAdapter = require('./demoAdapter');
const VnptInvoiceAdapter = require('./vnptAdapter');
const ViettelInvoiceAdapter = require('./viettelAdapter');
const MisaInvoiceAdapter = require('./misaAdapter');

/**
 * Lấy đối tượng adapter đang hoạt động
 * @returns {import('./providerAdapter')}
 */
function getEInvoiceAdapter() {
  const provider = (seller.eInvoiceProvider || process.env.EINVOICE_PROVIDER || 'demo').toLowerCase();

  switch (provider) {
    case 'vnpt':
      return new VnptInvoiceAdapter();
    case 'viettel':
      return new ViettelInvoiceAdapter();
    case 'misa':
      return new MisaInvoiceAdapter();
    case 'demo':
    default:
      return new DemoInvoiceAdapter();
  }
}

module.exports = {
  getEInvoiceAdapter,
  DemoInvoiceAdapter,
  VnptInvoiceAdapter,
  ViettelInvoiceAdapter,
  MisaInvoiceAdapter
};
