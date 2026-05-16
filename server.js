require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const morgan         = require('morgan');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const { v4: uuid }   = require('uuid');
const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const chatRoute      = require('./routes/chat');
const productRoutes  = require('./routes/productRoutes');
const settingsRouter = require('./routes/settingRoutes');

connectDB();

// Eager-load all models so populate always works
require('./models/User');
require('./models/Customer');
require('./models/Job');
require('./models/Invoice');
require('./models/Payment');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy:  { policy: 'cross-origin' },
  crossOriginOpenerPolicy:    false,
}));

app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy',  'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy','unsafe-none');
  next();
});

app.use((req, _res, next) => {
  req.id = uuid();
  next();
});

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin))        return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials:    true,
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      50,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

app.use('/api/',      apiLimiter);
app.use('/api/auth/', authLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'OK',
    env:       process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/services',  require('./routes/serviceRoutes'));
app.use('/api/jobs',      require('./routes/jobRoutes'));
app.use('/api/invoices',  require('./routes/invoiceRoutes'));
app.use('/api/payments',  require('./routes/paymentRoutes'));
app.use('/api/reports',   require('./routes/reportRoutes'));
app.use('/api/users',     require('./routes/userRoutes'));
app.use('/api/admin',     require('./routes/adminRoutes'));
app.use('/api/settings',  settingsRouter);
app.use('/api/ai',        require('./routes/aiRoutes'));
app.use('/api/chat',      chatRoute);
app.use('/api/bookings',  require('./routes/bookingRoutes'));
app.use('/api/products',  productRoutes);

// ─── Debug routes (remove in production) ──────────────────────────────────────
app.get('/api/debug-routes', (_req, res) => {
  const routes = [];
  app._router.stack.forEach(r => {
    if (r.handle?.stack) {
      r.handle.stack.forEach(s => {
        if (s.route) routes.push(`${Object.keys(s.route.methods)[0].toUpperCase()} ${s.route.path}`);
      });
    }
  });
  res.json(routes);
});

// ─── 404 — must be after all routes ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global error handler — must be LAST ─────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT   = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  🚀 FlowPOS Server`);
  console.log(`  📡 Port     : ${PORT}`);
  console.log(`  🌍 Env      : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  📧 Mailer   : ${process.env.EMAIL_USER || 'not configured'}`);
  console.log(`  ⏱  Started  : ${new Date().toISOString()}`);
  console.log('─────────────────────────────────────────');
});

const shutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received — shutting down gracefully…`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] 🔥 Unhandled Rejection:`, reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] 💥 Uncaught Exception:`, err.stack);
  server.close(() => process.exit(1));
});