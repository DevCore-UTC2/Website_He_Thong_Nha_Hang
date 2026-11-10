/**
 * SERVER ENTRY POINT - VỊ NHÀ MÌNH — Ẩm thực miền Tây & Nam Bộ
 * Stack: Node.js + Express 5 + SQLite + Socket.IO
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./config/db');
const { seedDatabase } = require('./seeds/seedData');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorMiddleware');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middlewares/authMiddleware');

// Import toàn bộ routes
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const dishRoutes = require('./routes/dishRoutes');
const cartRoutes = require('./routes/cartRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const orderRoutes = require('./routes/orderRoutes');
const tableRoutes = require('./routes/tableRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const staffRoutes = require('./routes/staffRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const storeRoutes = require('./routes/storeRoutes');
const { initStoreStatus } = require('./services/storeStatusService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// Lưu io vào app để các controller phát sự kiện realtime
app.set('io', io);

// Socket.IO Realtime handling
io.on('connection', (socket) => {
  // Tham gia phòng cụ thể (bếp, bàn)
  socket.on('join:room', (data) => {
    const room = typeof data === 'string' ? data : data?.room;
    const token = typeof data === 'object' ? data?.token : null;

    if (!room) return;

    // C12: Chặn join phòng staff/kitchen/admin khi không có token hợp lệ
    const restrictedRooms = ['staff', 'kitchen', 'admin'];
    if (restrictedRooms.includes(room)) {
      if (!token) return;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && (decoded.role === 'staff' || decoded.role === 'admin')) {
          socket.join(room);
        }
      } catch {
        // Token không hợp lệ -> chặn join
      }
      return;
    }

    socket.join(room);
  });

  // Sự kiện khách gọi nhân viên tại bàn (Sáng tạo ⑤)
  socket.on('table:call', (data) => {
    io.emit('staff:alert', {
      type: 'table_call',
      table_number: data.table_number,
      message: data.message || 'Khách yêu cầu hỗ trợ',
      time: new Date().toLocaleTimeString('vi-VN')
    });
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;

// Bảo mật HTTP Headers với Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Nén dữ liệu HTTP response với Gzip/Brotli
app.use(compression());

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Giới hạn tần suất gọi API (Rate Limiting)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.'
  }
});
app.use('/api', apiLimiter);

// Giới hạn nghiêm ngặt hơn cho API xác thực
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đăng nhập/đăng ký. Vui lòng thử lại sau 15 phút.'
  }
});
app.use('/api/auth', authLimiter);

// Phục vụ giao diện tĩnh Frontend và thư viện dùng chung
const isProduction = process.env.NODE_ENV === 'production';
const distPath = path.join(__dirname, '..', 'client', 'dist');
const rawClientPath = path.join(__dirname, '..', 'client');
const hasDistIndex = fs.existsSync(path.join(distPath, 'index.html'));
const clientPath = (isProduction || hasDistIndex)
  ? distPath
  : rawClientPath;

const publicPath = path.join(__dirname, '..', 'client', 'public');
const sharedPath = path.join(__dirname, '..', 'shared');

// Bộ nhớ đệm dài hạn (1 năm / 365 ngày) cho tài nguyên tĩnh: fonts, hình ảnh, âm thanh (Lighthouse Best Practices)
app.use('/public', express.static(publicPath, {
  maxAge: '365d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (/\.(woff2?|ttf|otf|eot)$/i.test(filePath)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(png|jpe?g|webp|svg|gif|ico|mp3|wav)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Bộ nhớ đệm dài hạn cho bundle đã được băm tên file (dist/assets)
app.use('/dist', express.static(distPath, {
  maxAge: '365d',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

// Phục vụ các module JS cho ES Modules trong dist/assets (tự động dự phòng sang dist/src hoặc raw client/src)
app.use('/dist/assets', express.static(path.join(distPath, 'assets')));
app.use('/dist/assets', express.static(path.join(distPath, 'src')));
app.use('/dist/assets', express.static(path.join(rawClientPath, 'src')));

// Phục vụ trực tiếp /src cho cả dev lẫn production
app.use('/src', express.static(path.join(distPath, 'src')));
app.use('/src', express.static(path.join(rawClientPath, 'src')));

app.use('/shared', express.static(sharedPath, { maxAge: isProduction ? '1h' : 0 }));
app.use(express.static(clientPath, {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filePath) => {
    if (/\.html$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Đảm bảo CSDL đã khởi tạo (migration + seed) xong trước khi xử lý bất kỳ API nào.
// Tránh lỗi "no such table" khi request đến sớm trên CSDL mới (ví dụ lúc chạy test).
const dbReady = initDatabase().then(() => seedDatabase()).then(() => initStoreStatus());
dbReady.catch(() => {}); // lỗi thật được báo ở startServer
app.use('/api', (req, res, next) => {
  dbReady.then(() => next(), next);
});

// Đăng ký toàn bộ API Routes theo đề tài
app.use('/api/store', storeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff-manager', staffRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Vị Nhà Mình — Restaurant API',
    version: '2.0.0',
    time: new Date().toISOString()
  });
});

// SPA fallback: chỉ áp dụng cho đường dẫn không có đuôi file và không thuộc nhóm tài nguyên tĩnh
app.use((req, res, next) => {
  const isAsset = /\.[a-z0-9]+$/i.test(req.path) ||
    ['/public', '/.well-known', '/shared', '/src', '/dist', '/assets', '/socket.io'].some(p => req.path.startsWith(p));
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api') && !isAsset) {
    return res.sendFile(path.join(clientPath, 'index.html'));
  }
  next();
});

// Error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Khởi chạy server
async function startServer() {
  try {
    await dbReady;

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n⚠️  CẢNH BÁO: Cổng (Port) ${PORT} đang được mở bởi một tiến trình hoặc cửa sổ khác.`);
        console.error(`👉 Bạn có thể mở trình duyệt truy cập ngay tại: http://localhost:${PORT}`);
        console.error(`👉 Hoặc đóng cửa sổ Terminal/CMD đang chạy ngầm trước khi mở lại.\n`);
      } else {
        console.error('❌ Lỗi máy chủ:', err);
      }
    });

    if (!process.env.NODE_TEST_CONTEXT) {
      server.listen(PORT, () => {
        console.log(`
==========================================================
🍽️  VỊ NHÀ MÌNH — Ẩm thực miền Tây & Nam Bộ
📍  Địa chỉ website:  http://localhost:${PORT}
⚡  Socket.IO:        Kích hoạt thời gian thực
📚  RESTful API:      http://localhost:${PORT}/api/health
🔑  Admin:            admin@vinhaminh.vn / Admin@1234
🔑  Nhân viên:        staff@vinhaminh.vn / Staff@1234
🔑  Khách hàng:       khach@gmail.com    / Khach@1234
==========================================================
        `);
      });
    }
  } catch (err) {
    console.error('❌ Lỗi khởi động:', err);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server };
