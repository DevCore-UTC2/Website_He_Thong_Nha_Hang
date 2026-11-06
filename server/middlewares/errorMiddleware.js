/**
 * ERROR HANDLING MIDDLEWARES
 * Áp dụng skills: backend-architect, api-design-principles
 * Bắt lỗi 404 và xử lý lỗi hệ thống tập trung
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy tài nguyên: ${req.method} ${req.originalUrl}`
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('🔥 Server Error:', err);

  const statusCode = err.status || 500;
  const message = err.message || 'Đã có lỗi nội bộ xảy ra từ phía máy chủ.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
