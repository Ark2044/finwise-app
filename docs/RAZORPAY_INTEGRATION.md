# Razorpay Integration Guide for FinWise

## Overview
This app uses Razorpay for wallet top-up functionality. Users can add money to their bank account balance using various payment methods supported by Razorpay.

## Features Implemented

### ✅ What's Implemented with Razorpay:
1. **Wallet Top-up** - Add money to bank account via Razorpay payment gateway
2. **Order Creation** - Razorpay Orders API integration
3. **Payment Verification** - Signature verification for security
4. **Multiple Payment Methods** - Cards, UPI, Net Banking, Wallets
5. **Webhook Support** - Async payment status updates
6. **Test Mode** - Full test mode support for development

### ❌ What's Simulated (Not Razorpay):
1. **P2P UPI Payments** - Sending money to other UPI IDs (simulated)
2. **VPA Validation** - Checking if UPI ID exists (simulated)
3. **UPI Lite** - Virtual wallet balance (simulated)
4. **QR Code Payments** - Scanning and paying (simulated)
5. **Internal Transfers** - Moving money between wallets (simulated)

## Setup Instructions

### 1. Get Razorpay Credentials

#### For Test Mode (Development):
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up or log in
3. Navigate to **Settings** → **API Keys**
4. Generate test keys (they start with `rzp_test_`)

#### For Live Mode (Production):
1. Complete KYC verification
2. Get your business approved
3. Generate live keys (they start with `rzp_live_`)

### 2. Configure Environment Variables

Update your `backend/.env` file:

```bash
# RAZORPAY CONFIGURATION
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

**Getting Webhook Secret:**
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Create a webhook endpoint: `https://yourdomain.com/webhooks/razorpay`
3. Select events: `payment.captured`, `payment.failed`, `order.paid`
4. Copy the webhook secret

### 3. Run Database Migration

Run the migration to create the `razorpay_orders` table:

```bash
cd backend
psql $DATABASE_URL -f migrations/003_razorpay_orders.sql
```

Or if using the setup script:
```bash
node scripts/setup-complete.js
```

### 4. Test Mode Cards

Use these test cards in Razorpay test mode:

| Card Number | CVV | Expiry | Behavior |
|-------------|-----|--------|----------|
| 4111 1111 1111 1111 | Any | Future | Success |
| 5555 5555 5555 4444 | Any | Future | Success |
| 4000 0000 0000 0002 | Any | Future | Failure |

### 5. Test Mode UPI

Test UPI IDs in Razorpay test mode:
- **Success**: `success@razorpay`
- **Failure**: `failure@razorpay`

## API Endpoints

### 1. Initiate Payment
```http
POST /wallet/add-money/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_xxxxxxxxxxxxx",
  "amount": 50000,
  "currency": "INR",
  "keyId": "rzp_test_xxxxxxxxxxxxx"
}
```

### 2. Verify Payment
```http
POST /wallet/add-money/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "razorpay_order_id": "order_xxxxxxxxxxxxx",
  "razorpay_payment_id": "pay_xxxxxxxxxxxxx",
  "razorpay_signature": "xxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "newBalance": 1500.00,
  "message": "₹500.00 added successfully",
  "paymentDetails": {
    "method": "card",
    "paymentId": "pay_xxxxxxxxxxxxx",
    "orderId": "order_xxxxxxxxxxxxx"
  }
}
```

### 3. Webhook Handler
```http
POST /webhooks/razorpay
X-Razorpay-Signature: <signature>
Content-Type: application/json

{
  "event": "payment.captured",
  "payload": { ... }
}
```

## Frontend Integration

The frontend uses Razorpay Checkout Standard integration:

```tsx
// Razorpay checkout is loaded via CDN
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

// Initialize checkout
var options = {
  "key": "rzp_test_xxxxx",
  "amount": "50000",
  "currency": "INR",
  "order_id": "order_xxxxx",
  "handler": function (response) {
    // Payment successful
  }
};

var rzp = new Razorpay(options);
rzp.open();
```

## Security Features

1. **Signature Verification** - All payments are verified using HMAC SHA256
2. **Order Idempotency** - Prevents duplicate processing
3. **User Validation** - Orders are tied to user accounts
4. **Webhook Verification** - Webhooks are verified before processing
5. **Amount Validation** - Min ₹1, Max ₹10,00,000

## Testing Workflow

### Happy Path:
1. User clicks "Add Money" in wallet
2. Enters amount (e.g., ₹500)
3. Razorpay checkout opens
4. User completes payment with test card
5. Payment is verified on backend
6. User balance is updated
7. Success message displayed

### Failure Scenarios:
1. **Invalid Signature** - Payment rejected
2. **Payment Failed** - User notified, balance not updated
3. **Cancelled Payment** - User notified, can retry
4. **Network Error** - Error handling with retry option

## Monitoring & Logs

Monitor transactions in:
1. **Razorpay Dashboard** - Live transaction monitoring
2. **Backend Logs** - Audit trail in `backend/logs/`
3. **Database** - `razorpay_orders` table for all orders

## Production Checklist

Before going live:
- [ ] Switch to live Razorpay keys
- [ ] Update webhook URL to production domain
- [ ] Enable HTTPS/SSL
- [ ] Test all payment methods
- [ ] Set up proper error alerting
- [ ] Configure payment limits
- [ ] Complete Razorpay KYC
- [ ] Review and accept Razorpay T&Cs

## Support & Documentation

- **Razorpay Docs**: https://razorpay.com/docs/
- **API Reference**: https://razorpay.com/docs/api/
- **Payment Gateway**: https://razorpay.com/docs/payments/payment-gateway/
- **Webhooks**: https://razorpay.com/docs/webhooks/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-upi-details/

## Troubleshooting

### Payment Not Verified
- Check signature calculation
- Verify environment variables
- Check network connectivity
- Review backend logs

### Webhook Not Working
- Verify webhook URL is publicly accessible
- Check webhook secret configuration
- Ensure HTTPS is enabled (for production)
- Check webhook event selection in dashboard

### Balance Not Updated
- Check database connection
- Verify transaction in `razorpay_orders` table
- Check user_id matches
- Review audit logs

## Contact

For issues or questions:
- Email: support@finwise.com
- Razorpay Support: https://razorpay.com/support/
