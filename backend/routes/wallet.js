const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter, paymentLimiter } = require('../middleware/rateLimiter');
const { logTransaction, logError, logSecurity } = require('../middleware/auditLogger');
const { setUserContext, resetUserContext } = require('../utils/helpers');

// Initialize Razorpay with proper error handling
let razorpay;
try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️  Razorpay credentials not configured. Wallet top-up will not work.');
  } else {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✓ Razorpay initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Razorpay:', error.message);
}

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Get account balance
 */
router.get('/account/balance', generalLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    await setUserContext(client, req.user.userId);

    const result = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: parseFloat(result.rows[0].balance) });
  } catch (error) {
    console.error('Balance fetch error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch balance' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Get wallet balances (bank + UPI Lite)
 */
router.get('/wallet/balances', generalLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    await setUserContext(client, req.user.userId);

    const result = await client.query(
      'SELECT balance, upi_lite_balance FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      bankBalance: parseFloat(user.balance || 0),
      upiLiteBalance: parseFloat(user.upi_lite_balance || 0)
    });
  } catch (error) {
    console.error('Wallet balances fetch error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch wallet balances' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Get wallet balance (single balance endpoint)
 */
router.get('/wallet/balance', generalLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    await setUserContext(client, req.user.userId);

    const result = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: parseFloat(result.rows[0].balance) });
  } catch (error) {
    console.error('Balance fetch error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch balance' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Initiate "Add Money" via Razorpay
 * Creates an order on Razorpay server using Orders API
 * Docs: https://razorpay.com/docs/api/orders/
 */
router.post('/wallet/add-money/initiate', paymentLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum amount is ₹1' });
    }

    if (amount > 1000000) {
      return res.status(400).json({ error: 'Maximum amount is ₹10,00,000' });
    }

    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    await setUserContext(client, req.user.userId);

    // Get user details for receipt
    const userResult = await client.query(
      'SELECT name, email, mobile_number FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Create Razorpay Order
    const options = {
      amount: Math.round(amount * 100), // amount in paise (smallest currency unit)
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`, // Max 40 chars as per Razorpay
      notes: {
        user_id: req.user.userId.toString(),
        type: 'wallet_topup',
        name: user.name || '',
        mobile: user.mobile_number || '',
        email: user.email || ''
      }
    };

    const order = await razorpay.orders.create(options);

    // Store order in database for verification
    await client.query(
      `INSERT INTO razorpay_orders (order_id, user_id, amount, currency, receipt, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (order_id) DO NOTHING`,
      [order.id, req.user.userId, amount, order.currency, order.receipt, 'created']
    );

    logTransaction('RAZORPAY_ORDER_CREATED', {
      userId: req.user.userId,
      orderId: order.id,
      amount: amount,
      receipt: order.receipt
    }, req);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount, // in paise
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Razorpay order creation error:', error);
    logError(error, req);
    
    // Handle specific Razorpay errors
    if (error.error && error.error.description) {
      return res.status(400).json({ error: error.error.description });
    }
    
    res.status(500).json({ error: 'Failed to initiate payment' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Verify Razorpay Payment and Update Wallet
 * Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/#step-3-verify-signature
 */
router.post('/wallet/add-money/verify', paymentLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Step 1: Verify signature using Razorpay's signature verification
    // Signature format: HMAC SHA256(order_id + "|" + payment_id, secret)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      logSecurity('RAZORPAY_SIGNATURE_MISMATCH', {
        userId: req.user.userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      }, req);
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    await setUserContext(client, req.user.userId);
    await client.query('BEGIN');

    // Step 2: Check if this order exists and belongs to this user
    const orderResult = await client.query(
      'SELECT * FROM razorpay_orders WHERE order_id = $1 AND user_id = $2',
      [razorpay_order_id, req.user.userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Step 3: Check if payment already processed (idempotency)
    if (order.status === 'paid') {
      await client.query('ROLLBACK');
      return res.json({
        success: true,
        message: 'Payment already processed',
        newBalance: parseFloat(order.new_balance)
      });
    }

    // Step 4: Fetch payment details from Razorpay to verify status
    let payment;
    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to fetch payment from Razorpay:', error);
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Step 5: Verify payment status and amount
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Payment not successful. Status: ${payment.status}` });
    }

    if (payment.order_id !== razorpay_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Payment order mismatch' });
    }

    const amountInRupees = parseFloat(payment.amount) / 100;

    // Step 6: Update user balance
    const balanceResult = await client.query(
      'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance',
      [amountInRupees, req.user.userId]
    );

    if (balanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const newBalance = parseFloat(balanceResult.rows[0].balance);

    // Step 7: Update order status
    await client.query(
      `UPDATE razorpay_orders 
       SET status = $1, payment_id = $2, paid_at = NOW(), new_balance = $3 
       WHERE order_id = $4`,
      ['paid', razorpay_payment_id, newBalance, razorpay_order_id]
    );

    await client.query('COMMIT');

    logTransaction('RAZORPAY_PAYMENT_SUCCESS', {
      userId: req.user.userId,
      amount: amountInRupees,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      method: payment.method,
      newBalance: newBalance
    }, req);

    res.json({
      success: true,
      newBalance: newBalance,
      message: `₹${amountInRupees.toFixed(2)} added successfully`,
      paymentDetails: {
        method: payment.method,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment verification error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Payment verification failed' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Add money to bank account (simulation)
 */
router.post('/wallet/add-to-bank', paymentLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await setUserContext(client, req.user.userId);

    // Update bank balance (simulation of adding money from external source)
    const result = await client.query(
      'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance',
      [amount, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logTransaction('ADD_TO_BANK', {
      userId: req.user.userId,
      amount: amount,
      newBalance: parseFloat(result.rows[0].balance)
    }, req);

    res.json({ 
      success: true, 
      newBalance: parseFloat(result.rows[0].balance),
      message: `₹${amount} added to bank account`
    });
  } catch (error) {
    console.error('Add to bank error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to add money to bank account' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Transfer money from bank to UPI Lite
 */
router.post('/wallet/transfer-to-upi-lite', paymentLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await setUserContext(client, req.user.userId);
    await client.query('BEGIN');

    // Check bank balance
    const balanceResult = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (balanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBankBalance = parseFloat(balanceResult.rows[0].balance);
    if (currentBankBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient bank balance' });
    }

    // Transfer from bank to UPI Lite
    const result = await client.query(
      `UPDATE users 
       SET balance = balance - $1, 
           upi_lite_balance = COALESCE(upi_lite_balance, 0) + $1,
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING balance, upi_lite_balance`,
      [amount, req.user.userId]
    );

    await client.query('COMMIT');

    logTransaction('TRANSFER_TO_UPI_LITE', {
      userId: req.user.userId,
      amount: amount,
      newBankBalance: parseFloat(result.rows[0].balance),
      newUpiLiteBalance: parseFloat(result.rows[0].upi_lite_balance)
    }, req);

    res.json({
      success: true,
      bankBalance: parseFloat(result.rows[0].balance),
      upiLiteBalance: parseFloat(result.rows[0].upi_lite_balance),
      message: `₹${amount} transferred to UPI Lite`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer to UPI Lite error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to transfer to UPI Lite' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Transfer money from UPI Lite to bank
 */
router.post('/wallet/transfer-to-bank', paymentLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await setUserContext(client, req.user.userId);
    await client.query('BEGIN');

    // Check UPI Lite balance
    const balanceResult = await client.query(
      'SELECT upi_lite_balance FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (balanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUpiLiteBalance = parseFloat(balanceResult.rows[0].upi_lite_balance || 0);
    if (currentUpiLiteBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient UPI Lite balance' });
    }

    // Transfer from UPI Lite to bank
    const result = await client.query(
      `UPDATE users 
       SET balance = balance + $1, 
           upi_lite_balance = upi_lite_balance - $1,
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING balance, upi_lite_balance`,
      [amount, req.user.userId]
    );

    await client.query('COMMIT');

    logTransaction('TRANSFER_TO_BANK', {
      userId: req.user.userId,
      amount: amount,
      newBankBalance: parseFloat(result.rows[0].balance),
      newUpiLiteBalance: parseFloat(result.rows[0].upi_lite_balance)
    }, req);

    res.json({
      success: true,
      bankBalance: parseFloat(result.rows[0].balance),
      upiLiteBalance: parseFloat(result.rows[0].upi_lite_balance),
      message: `₹${amount} transferred to bank account`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer to bank error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to transfer to bank' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

module.exports = router;
