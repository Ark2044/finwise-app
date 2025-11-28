const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validateVPA } = require('../middleware/validator');

/**
 * Validate VPA (public endpoint with rate limiting)
 */
router.post('/vpa/validate', generalLimiter, validateVPA, async (req, res) => {
  try {
    const { vpa } = req.body;

    // First check if VPA exists in our database
    const result = await pool.query(
      'SELECT name FROM users WHERE vpa = $1 AND status = $2',
      [vpa, 'active']
    );

    if (result.rows.length > 0) {
      res.json({
        valid: true,
        name: result.rows[0].name,
      });
      return;
    }

    // For testing/demo purposes, simulate VPA validation for known providers
    const vpaLowerCase = vpa.toLowerCase();
    let simulatedName = null;

    // Simulate validation for common UPI providers
    if (vpaLowerCase.includes('paytm') || vpaLowerCase.endsWith('@ptys')) {
      simulatedName = 'Paytm Merchant';
    } else if (vpaLowerCase.endsWith('@ybl')) {
      simulatedName = 'PhonePe User';
    } else if (vpaLowerCase.endsWith('@oksbi') || vpaLowerCase.endsWith('@sbi')) {
      simulatedName = 'SBI User';
    } else if (vpaLowerCase.endsWith('@hdfcbank')) {
      simulatedName = 'HDFC User';
    } else if (vpaLowerCase.endsWith('@icici')) {
      simulatedName = 'ICICI User';
    } else if (vpaLowerCase.endsWith('@axisbank')) {
      simulatedName = 'Axis Bank User';
    } else if (vpaLowerCase.endsWith('@upi')) {
      simulatedName = 'UPI User';
    }

    if (simulatedName) {
      res.json({
        valid: true,
        name: simulatedName,
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('VPA validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

module.exports = router;
