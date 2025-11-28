const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { paymentLimiter, generalLimiter } = require('../middleware/rateLimiter');
const { validatePayment, validateTransactionId } = require('../middleware/validator');
const { logTransaction, logSecurity, logError, paymentLogger } = require('../middleware/auditLogger');
const { setUserContext, resetUserContext, generateChecksum, verifyWebhookSignature } = require('../utils/helpers');

/**
 * Initiate UPI payment
 */
router.post('/payments/initiate', authenticateToken, paymentLimiter, paymentLogger, validatePayment, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, receiverVPA, receiverName, note, transactionId, checksum, paymentMethod } = req.body;

    await setUserContext(client, req.user.userId);

    // Verify checksum
    // Ensure consistent payload structure with frontend
    const checksumPayload = { 
      amount: parseFloat(amount.toString()), 
      receiverVPA: receiverVPA || '', 
      receiverName: receiverName || '', 
      note: (note || '').toString().trim(), // Ensure note is always a string and trimmed
      transactionId: transactionId, 
      paymentMethod: paymentMethod || 'UPI' // Default to UPI if undefined
    };
    const expectedChecksum = generateChecksum(checksumPayload);
    
    if (checksum !== expectedChecksum) {
      logSecurity('INVALID_CHECKSUM', { transactionId, userId: req.user.userId }, req);
      return res.status(401).json({ error: 'Invalid checksum' });
    }

    // Check if transaction ID already exists
    const existingTxn = await client.query(
      'SELECT id FROM transactions WHERE transaction_id = $1',
      [transactionId]
    );

    if (existingTxn.rows.length > 0) {
      logSecurity('DUPLICATE_TRANSACTION', { transactionId, userId: req.user.userId }, req);
      return res.status(409).json({ error: 'Transaction already exists' });
    }

    // Check user balance based on payment method
    const balanceQuery = paymentMethod === 'UPI_LITE' 
      ? 'SELECT upi_lite_balance as balance FROM users WHERE id = $1'
      : 'SELECT balance FROM users WHERE id = $1';

    const balanceResult = await client.query(balanceQuery, [req.user.userId]);

    if (balanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    if (currentBalance < amount) {
      logTransaction('INSUFFICIENT_BALANCE', { userId: req.user.userId, amount, balance: currentBalance, paymentMethod }, req);
      return res.status(400).json({ error: `Insufficient ${paymentMethod === 'UPI_LITE' ? 'UPI Lite ' : ''}balance` });
    }

    // Start transaction
    await client.query('BEGIN');

    // Deduct balance
    const updateBalanceQuery = paymentMethod === 'UPI_LITE'
      ? 'UPDATE users SET upi_lite_balance = upi_lite_balance - $1 WHERE id = $2'
      : 'UPDATE users SET balance = balance - $1 WHERE id = $2';

    await client.query(updateBalanceQuery, [amount, req.user.userId]);

    // Extract additional payment data for analytics
    const { mcc, category, merchantType } = req.body;

    // Create transaction record with analytics data
    const result = await client.query(
      `INSERT INTO transactions (transaction_id, user_id, amount, receiver_vpa, receiver_name, transaction_note, status, checksum, mcc, category, merchant_type, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [transactionId, req.user.userId, amount, receiverVPA, receiverName, note, 'success', expectedChecksum, mcc, category, merchantType, paymentMethod || 'UPI']
    );

    await client.query('COMMIT');

    const transaction = result.rows[0];

    logTransaction('PAYMENT_SUCCESS', {
      transactionId,
      userId: req.user.userId,
      amount,
      receiverVPA,
    }, req);

    res.json({
      success: true,
      orderId: `ORDER_${Date.now()}`,
      transactionId: transaction.transaction_id,
      status: transaction.status,
      amount: parseFloat(transaction.amount),
      timestamp: transaction.created_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment initiation error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Payment failed' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Verify payment status
 */
router.get('/payments/verify/:transactionId', authenticateToken, generalLimiter, validateTransactionId, async (req, res) => {
  const client = await pool.connect();
  try {
    const { transactionId } = req.params;

    await setUserContext(client, req.user.userId);

    const result = await client.query(
      'SELECT * FROM transactions WHERE transaction_id = $1 AND user_id = $2',
      [transactionId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    res.json({
      transactionId: transaction.transaction_id,
      amount: parseFloat(transaction.amount),
      receiverVPA: transaction.receiver_vpa,
      receiverName: transaction.receiver_name,
      note: transaction.transaction_note,
      status: transaction.status,
      createdAt: transaction.created_at,
      completedAt: transaction.completed_at,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Verification failed' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Get transaction history
 */
router.get('/transactions', authenticateToken, generalLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { limit = 50 } = req.query;

    await setUserContext(client, req.user.userId);

    const result = await client.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.user.userId, parseInt(limit)]
    );

    const transactions = result.rows.map(t => ({
      transactionId: t.transaction_id,
      amount: parseFloat(t.amount),
      receiverVPA: t.receiver_vpa,
      receiverName: t.receiver_name,
      note: t.transaction_note,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
    }));

    res.json(transactions);
  } catch (error) {
    console.error('Transaction history error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Get transaction receipt
 */
router.get('/transactions/:transactionId/receipt', authenticateToken, generalLimiter, validateTransactionId, async (req, res) => {
  const client = await pool.connect();
  try {
    const { transactionId } = req.params;

    await setUserContext(client, req.user.userId);

    const result = await client.query(
      'SELECT * FROM transactions WHERE transaction_id = $1 AND user_id = $2',
      [transactionId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    res.json({
      transactionId: transaction.transaction_id,
      amount: parseFloat(transaction.amount),
      receiverName: transaction.receiver_name,
      receiverVPA: transaction.receiver_vpa,
      timestamp: transaction.created_at,
      status: transaction.status,
      utr: transaction.transaction_ref || transaction.transaction_id,
    });
  } catch (error) {
    console.error('Receipt fetch error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  } finally {
    await resetUserContext(client);
    client.release();
  }
});

/**
 * Webhook endpoint for payment gateway callbacks
 */
router.post('/webhooks/payment', async (req, res) => {
  const client = await pool.connect();
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      logSecurity('INVALID_WEBHOOK_SIGNATURE', {}, req);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, payload: data } = req.body;

    if (event === 'payment.success') {
      await client.query(
        'UPDATE transactions SET status = $1, completed_at = NOW() WHERE transaction_id = $2',
        ['success', data.order_id]
      );

      logTransaction('WEBHOOK_PAYMENT_SUCCESS', { orderId: data.order_id }, req);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Webhook processing failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
