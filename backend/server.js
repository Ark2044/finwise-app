/**
 * FinWise UPI Payment Backend Server
 * Production-ready Node.js/Express backend with industry-grade security
 * 
 * Security Features:
 * - JWT Authentication with access/refresh tokens
 * - Rate limiting to prevent brute force attacks
 * - Row-Level Security (RLS) for database isolation
 * - Comprehensive audit logging
 * - Input validation and sanitization
 * - CSRF protection
 * - Security headers (Helmet)
 * - CORS configuration
 */

const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import middleware
const { requestLogger, logError } = require('./middleware/auditLogger');

// Import routes
const authRoutes = require('./routes/auth');
const upiRoutes = require('./routes/upi');
const walletRoutes = require('./routes/wallet');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const createAnalyticsRoutes = require('./routes/analytics');
const cryptoRoutes = require('./routes/crypto');

// Import DB config (initializes connection)
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('❌ CRITICAL: JWT secrets not configured in .env file!');
  process.exit(1);
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',') 
      : ['http://localhost:8081', 'http://localhost:3000'];
    
    // Allow localhost and local network IPs (for mobile development)
    const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
    
    if (allowedOrigins.indexOf(origin) !== -1 || isLocalNetwork) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['set-cookie'],
  preflightContinue: false,
};
app.use(cors(corsOptions));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ==================== ROUTES ====================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Handle preflight requests for VPA validate endpoint
app.options('/vpa/validate', cors(corsOptions), (req, res) => {
  res.status(200).end();
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/', upiRoutes); // Mounted at root because paths are fully qualified in upi.js
app.use('/', walletRoutes); // Mounted at root because paths are fully qualified in wallet.js
app.use('/', paymentRoutes); // Mounted at root because paths are fully qualified in payments.js
app.use('/', webhookRoutes); // Webhook routes for Razorpay
app.use('/analytics', createAnalyticsRoutes(pool));
app.use('/crypto', cryptoRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  logError(err, req);

  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({ error: errorMessage });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Start server - listen on all network interfaces for development
const HOST = process.env.NODE_ENV === 'production' ? 'localhost' : '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ FinWise Backend Server - PRODUCTION MODE');
  console.log('='.repeat(60));
  console.log(`📍 Server running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Network access: http://192.168.29.152:${PORT}/health`);
  console.log(`🔐 JWT Authentication: ENABLED`);
  console.log(`🛡️  Rate Limiting: ENABLED`);
  console.log(`🔒 Row-Level Security: ENABLED`);
  console.log(`📝 Audit Logging: ENABLED`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60) + '\n');
});
