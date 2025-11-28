const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  authenticateToken 
} = require('../middleware/auth');
const { authLimiter, generalLimiter } = require('../middleware/rateLimiter');
const { validatePIN } = require('../middleware/validator');
const { logAuth, logSecurity, logError } = require('../middleware/auditLogger');
const { setUserContext, resetUserContext } = require('../utils/helpers');

// In-memory refresh token storage (in production, use Redis or database)
const refreshTokens = new Map();

/**
 * User registration (Email/Password + VPA/PIN)
 */
router.post('/register', authLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, password, vpa, upiPin } = req.body;

    if (!name || !email || !password || !vpa || !upiPin) {
      return res.status(400).json({ error: 'All fields (name, email, password, vpa, upiPin) are required' });
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR vpa = $2',
      [email, vpa]
    );

    if (existingUser.rows.length > 0) {
      logSecurity('DUPLICATE_REGISTRATION_ATTEMPT', { email, vpa }, req);
      return res.status(409).json({ error: 'User with this email or VPA already exists' });
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Hash UPI PIN
    const upiPinHash = await bcrypt.hash(upiPin, 12);

    // Create user
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, vpa, upi_pin_hash, balance, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, vpa, balance`,
      [name, email, passwordHash, vpa, upiPinHash, 10000.00, 'active']
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    refreshTokens.set(user.id, refreshToken);

    logAuth('USER_REGISTRATION', user.id, true, req, { vpa });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        vpa: user.vpa,
        balance: parseFloat(user.balance),
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

/**
 * User login (Email/Password)
 */
router.post('/login', authLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await client.query(
      'SELECT id, name, vpa, password_hash, balance, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logAuth('LOGIN_FAILED', null, false, req, { email, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (user.status !== 'active') {
      logSecurity('INACTIVE_ACCOUNT_LOGIN_ATTEMPT', { userId: user.id, email }, req);
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify Password
    if (!user.password_hash) {
        // Legacy user or created via other method without password
        return res.status(401).json({ error: 'Please reset your password' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      logAuth('LOGIN_FAILED', user.id, false, req, { email, reason: 'invalid_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    refreshTokens.set(user.id, refreshToken);

    logAuth('LOGIN_SUCCESS', user.id, true, req, { email });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        vpa: user.vpa,
        balance: parseFloat(user.balance),
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
});

/**
 * Refresh access token
 */
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = await verifyRefreshToken(refreshToken);
    const accessToken = generateAccessToken(decoded.userId);

    logAuth('TOKEN_REFRESH', decoded.userId, true, req);

    res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    logAuth('TOKEN_REFRESH_FAILED', null, false, req, { error: error.message });
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Neon Auth integration removed
// router.post('/neon-login', ...);

/**
 * Logout user and invalidate refresh token
 */
router.post('/logout', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Remove refresh token from memory store
    refreshTokens.delete(userId);
    
    logAuth('USER_LOGOUT', { userId }, req);
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Verify UPI PIN for authenticated user
 */
router.post('/verify-pin', authenticateToken, generalLimiter, validatePIN, async (req, res) => {
  const client = await pool.connect();
  try {
    const { pin } = req.body;

    await setUserContext(client, req.user.userId);

    const result = await client.query(
      'SELECT upi_pin_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pinValid = await bcrypt.compare(pin, result.rows[0].upi_pin_hash);

    res.json({ valid: pinValid });
  } catch (error) {
    console.error('PIN verification error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Verification failed' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

module.exports = router;
