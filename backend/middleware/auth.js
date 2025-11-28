/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets must be configured in environment variables');
}

/**
 * Generate access token
 */
function generateAccessToken(userId, additionalClaims = {}) {
  return jwt.sign(
    {
      userId,
      type: 'access',
      ...additionalClaims,
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
      issuer: 'finwise-api',
      audience: 'finwise-app',
    }
  );
}

/**
 * Generate refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    {
      userId,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      issuer: 'finwise-api',
      audience: 'finwise-app',
    }
  );
}

/**
 * Middleware to verify JWT access token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, { issuer: 'finwise-api', audience: 'finwise-app' }, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }

    if (decoded.type !== 'access') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    req.user = {
      userId: decoded.userId,
      ...decoded,
    };
    next();
  });
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      JWT_REFRESH_SECRET,
      { issuer: 'finwise-api', audience: 'finwise-app' },
      (err, decoded) => {
        if (err) reject(err);
        else if (decoded.type !== 'refresh') reject(new Error('Invalid token type'));
        else resolve(decoded);
      }
    );
  });
}

/**
 * Optional authentication - proceeds even without token
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, { issuer: 'finwise-api', audience: 'finwise-app' }, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = {
        userId: decoded.userId,
        ...decoded,
      };
    }
    next();
  });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
  verifyRefreshToken,
  optionalAuth,
};
