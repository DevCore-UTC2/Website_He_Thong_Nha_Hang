/**
 * DASHBOARD CONTROLLER — VỊ NHÀ MÌNH
 * Mục 16: Dashboard doanh thu, tách VAT theo mức (8% & 10%) & Xuất báo cáo CSV
 */

const { dbAsync } = require('../config/db');

// Lấy thống kê tổng quan doanh thu và tình hình kinh doanh
async function getDashboardStats(req, res, next) {
  try {
    // 1. Thống kê tổng doanh thu, bóc tách thuế VAT 8% và 10%
    const overview = await dbAsync.get(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_before_vat ELSE 0 END), 0) as total_before_vat,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN vat_8_amount ELSE 0 END), 0) as total_vat_8,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN vat_10_amount ELSE 0 END), 0) as total_vat_10,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN vat_amount ELSE 0 END), 0) as total_vat,
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') AND status != 'cancelled' THEN total_amount ELSE 0 END), 0) as today_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
    `);

    // 2. Tổng khách hàng đăng ký
    const customerCount = await dbAsync.get("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");

    // 3. Top món ăn bán chạy nhất
    const topDishes = await dbAsync.all(`
      SELECT 
        dish_name, 
        SUM(quantity) as total_sold, 
        SUM(item_total) as total_revenue,
        COALESCE(SUM(amount_before_vat), 0) as revenue_before_vat,
        COALESCE(SUM(vat_amount), 0) as total_vat
      FROM order_items
      GROUP BY dish_name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    // 4. Doanh thu theo phương thức thanh toán
    const paymentStats = await dbAsync.all(`
      SELECT payment_method, COUNT(*) as count, SUM(total_amount) as amount 
      FROM orders 
      WHERE status != 'cancelled' 
      GROUP BY payment_method
    `);

    // 5. Thống kê theo ngày gần đây (phục vụ vẽ biểu đồ doanh thu)
    const recentDays = await dbAsync.all(`
      SELECT 
        DATE(created_at) as order_date, 
        COUNT(*) as order_count,
        SUM(total_amount) as daily_revenue,
        SUM(total_before_vat) as daily_before_vat,
        SUM(vat_amount) as daily_vat
      FROM orders
      WHERE status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY order_date DESC
      LIMIT 7
    `);

    res.json({
      success: true,
      data: {
        overview: {
          total_revenue: overview.total_revenue,
          total_before_vat: overview.total_before_vat,
          total_vat_8: overview.total_vat_8,
          total_vat_10: overview.total_vat_10,
          total_vat: overview.total_vat,
          today_revenue: overview.today_revenue,
          total_orders: overview.total_orders,
          completed_orders: overview.completed_orders,
          cancelled_orders: overview.cancelled_orders,
          total_customers: customerCount ? customerCount.count : 0
        },
        topDishes,
        paymentStats,
        recentDays: recentDays.reverse()
      }
    });
  } catch (err) {
    next(err);
  }
}

// Xuất báo cáo doanh thu ra định dạng CSV (Mục 16)
async function exportCsv(req, res, next) {
  try {
    const orders = await dbAsync.all(`
      SELECT 
        order_code, 
        customer_name, 
        customer_phone, 
        order_type, 
        payment_method, 
        status, 
        total_before_vat,
        vat_8_amount,
        vat_10_amount,
        vat_amount,
        total_amount, 
        created_at 
      FROM orders 
      ORDER BY id DESC
    `);

    // Header UTF-8 BOM để Excel hiển thị tiếng Việt không bị lỗi font
    let csv = '\uFEFFMã Đơn,Khách Hàng,Số Điện Thoại,Loại Đơn,Thanh Toán,Trạng Thái,Chưa Thuế (VNĐ),VAT 8% (VNĐ),VAT 10% (VNĐ),Tổng VAT (VNĐ),Tổng Thanh Toán (VNĐ),Thời Gian Tạo\n';

    orders.forEach(o => {
      csv += `"${o.order_code}","${o.customer_name}","${o.customer_phone}","${o.order_type}","${o.payment_method}","${o.status}",${o.total_before_vat || 0},${o.vat_8_amount || 0},${o.vat_10_amount || 0},${o.vat_amount || 0},${o.total_amount},"${o.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=Bao_Cao_Doanh_Thu_Vi_Nha_Minh.csv');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  exportCsv
};
