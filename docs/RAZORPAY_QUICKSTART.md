# Razorpay Quick Start Guide

## Setup in 5 Minutes

### Step 1: Get Razorpay Test Keys

1. Visit https://dashboard.razorpay.com/signup
2. Create an account (use test mode)
3. Go to Settings → API Keys
4. Click "Generate Test Key"
5. Copy your:
   - Key ID (starts with `rzp_test_`)
   - Key Secret

### Step 2: Update Backend Environment

Edit `backend/.env`:

```bash
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_SECRET_HERE
```

### Step 3: Run Database Migration

```bash
cd backend
psql $DATABASE_URL -f migrations/003_razorpay_orders.sql
```

Or if you prefer Node.js:
```bash
node scripts/setup-complete.js
```

### Step 4: Restart Backend Server

```bash
cd backend
npm start
```

Look for: `✓ Razorpay initialized successfully`

### Step 5: Test Payment Flow

1. Open the app
2. Go to Wallet screen
3. Click "Add Money"
4. Enter amount: `100`
5. Click "Proceed"
6. Razorpay checkout will open

### Step 6: Complete Test Payment

Use these test credentials:

**Test Card:**
- Card Number: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: Any future date
- Name: Any name

**Test UPI:**
- UPI ID: `success@razorpay`

**Test Wallet:**
- Select any wallet and it will succeed

### Expected Result

✅ Payment successful
✅ Balance updated in wallet
✅ Transaction recorded in database

## Test Scenarios

### Successful Payment
Amount: ₹100
Card: 4111 1111 1111 1111
Result: ✅ Success

### Failed Payment
Amount: ₹100
Card: 4000 0000 0000 0002
Result: ❌ Payment Failed

### Cancelled Payment
Click "X" on Razorpay checkout
Result: ⚠️ Payment Cancelled

## Troubleshooting

### "Payment service not configured"
- Check if RAZORPAY_KEY_ID is set in .env
- Restart backend server
- Check server logs for initialization

### "Failed to initiate payment"
- Check internet connectivity
- Verify Razorpay dashboard is accessible
- Check if test mode is enabled

### "Invalid payment signature"
- Check RAZORPAY_KEY_SECRET is correct
- Don't modify payment response
- Check server logs for signature details

## Next Steps

1. ✅ Test various payment methods
2. ✅ Test failure scenarios
3. ✅ Set up webhooks (optional for now)
4. 🚀 When ready for production:
   - Complete KYC on Razorpay
   - Switch to live keys
   - Enable webhooks
   - Test with real small amounts

## Support

- 📖 Full docs: `docs/RAZORPAY_INTEGRATION.md`
- 🌐 Razorpay docs: https://razorpay.com/docs/
- 💬 Questions? Check the main README.md

---

**Ready to test!** 🚀
