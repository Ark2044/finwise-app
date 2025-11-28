/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 'Check Retry-After header',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 5 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 5 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS) || 5,
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 'Check Retry-After header',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log suspicious activity
    console.warn('⚠️ Rate limit exceeded for auth endpoint', {
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Payment endpoint rate limiter
 * 20 payments per hour per IP
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  skipSuccessfulRequests: false,
  message: {
    error: 'Payment limit exceeded, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log for fraud detection
    console.warn('⚠️ Payment rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Payment limit exceeded',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  paymentLimiter,
};
