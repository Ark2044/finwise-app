/**
 * Razorpay Webhook Handler
 * Handles payment status updates from Razorpay
 * Docs: https://razorpay.com/docs/webhooks/
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const crypto = require('crypto');
const { logTransaction, logError, logSecurity } = require('../middleware/auditLogger');

/**
 * Verify Razorpay webhook signature
 * @param {string} webhookBody - Raw webhook body
 * @param {string} signature - X-Razorpay-Signature header
 * @returns {boolean}
 */
function verifyWebhookSignature(webhookBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(webhookBody)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Razorpay Webhook Endpoint
 * Handles various payment events
 */
router.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookBody = req.body.toString();

    // Verify webhook signature
    if (!verifyWebhookSignature(webhookBody, signature)) {
      logSecurity('INVALID_WEBHOOK_SIGNATURE', { headers: req.headers }, req);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(webhookBody);
    const eventType = event.event;
    const payload = event.payload.payment.entity || event.payload.order.entity;

    console.log('Webhook received:', eventType, payload.id);

    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(client, payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(client, payload);
        break;

      case 'order.paid':
        await handleOrderPaid(client, payload);
        break;

      default:
        console.log('Unhandled webhook event:', eventType);
    }

    logTransaction('WEBHOOK_RECEIVED', { event: eventType, id: payload.id }, req);
    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    logError(error, req);
    // Always return 200 to Razorpay to avoid retries for parsing errors
    res.status(200).json({ status: 'error', message: error.message });
  } finally {
    client.release();
  }
});

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(client, payment) {
  try {
    await client.query('BEGIN');

    // Find the order
    const orderResult = await client.query(
      'SELECT * FROM razorpay_orders WHERE order_id = $1 FOR UPDATE',
      [payment.order_id]
    );

    if (orderResult.rows.length === 0) {
      console.warn('Order not found for payment:', payment.id);
      await client.query('ROLLBACK');
      return;
    }

    const order = orderResult.rows[0];

    // Check if already processed
    if (order.status === 'paid') {
      console.log('Payment already processed:', payment.id);
      await client.query('ROLLBACK');
      return;
    }

    const amountInRupees = parseFloat(payment.amount) / 100;

    // Update user balance
    await client.query(
      'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amountInRupees, order.user_id]
    );

    // Update order status
    await client.query(
      `UPDATE razorpay_orders 
       SET status = $1, 
           payment_id = $2, 
           payment_method = $3,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE order_id = $4`,
      ['paid', payment.id, payment.method, payment.order_id]
    );

    await client.query('COMMIT');

    console.log('Payment processed successfully:', payment.id);
    logTransaction('WEBHOOK_PAYMENT_PROCESSED', {
      userId: order.user_id,
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: amountInRupees
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error handling payment.captured:', error);
    throw error;
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(client, payment) {
  try {
    await client.query(
      `UPDATE razorpay_orders 
       SET status = $1, 
           payment_id = $2,
           error_code = $3,
           error_description = $4,
           updated_at = NOW()
       WHERE order_id = $5`,
      [
        'failed',
        payment.id,
        payment.error_code,
        payment.error_description,
        payment.order_id
      ]
    );

    console.log('Payment failed recorded:', payment.id);
    logTransaction('WEBHOOK_PAYMENT_FAILED', {
      paymentId: payment.id,
      orderId: payment.order_id,
      errorCode: payment.error_code
    });

  } catch (error) {
    console.error('Error handling payment.failed:', error);
    throw error;
  }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(client, order) {
  try {
    await client.query(
      'UPDATE razorpay_orders SET status = $1, updated_at = NOW() WHERE order_id = $2',
      ['paid', order.id]
    );

    console.log('Order marked as paid:', order.id);

  } catch (error) {
    console.error('Error handling order.paid:', error);
    throw error;
  }
}

module.exports = router;
