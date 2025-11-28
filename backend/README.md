# FinWise Backend - Production-Ready UPI Payment Server

## 🔐 Security Features

This backend implements **industry-grade security** compliant with:
- ✅ RBI Guidelines for payment applications
- ✅ NPCI UPI security requirements
- ✅ PCI DSS standards
- ✅ OWASP security best practices

### Implemented Security Layers

1. **JWT Authentication** - Access & refresh tokens with 15min/7day expiry
2. **Row-Level Security (RLS)** - Database-level user data isolation
3. **Rate Limiting** - 3-tier protection against brute force
4. **Audit Logging** - Comprehensive security event tracking
5. **Input Validation** - All endpoints protected with express-validator
6. **Encryption** - AES-256 for sensitive data, bcrypt for passwords
7. **Security Headers** - Helmet.js (HSTS, CSP, X-Frame-Options, etc.)
8. **SSL/TLS** - Enforced with strict certificate validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (Neon recommended)
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` with your actual values:

**Critical Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-64-character-hex-string-here
JWT_REFRESH_SECRET=your-64-character-hex-string-here

# Encryption (exactly 32 chars for AES-256)
ENCRYPTION_KEY=your-32-character-key-here-exactly
```

3. **Set up database:**
```bash
# Simple setup (recommended for development)
npm run setup-simple

# OR: Full setup with RLS (if needed)
npm run setup-complete

# OR: Original basic setup only
npm run setup-db
```

4. **Start server:**
```bash
# Development
npm run dev

# Production
NODE_ENV=production npm start
```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/auth/register`
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobileNumber": "9876543210",
  "vpa": "john@finwise",
  "upiPin": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "vpa": "john@finwise",
    "balance": 10000.00
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Rate Limit:** 5 requests per 5 minutes per IP

#### POST `/auth/login`
Login with VPA and UPI PIN.

**Request:**
```json
{
  "vpa": "john@finwise",
  "upiPin": "123456"
}
```

**Response:** Same as register

**Rate Limit:** 5 requests per 5 minutes per IP

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbG..."
}
```

### Protected Endpoints

All endpoints below require `Authorization: Bearer <accessToken>` header.

#### GET `/account/balance`
Get current account balance.

**Response:**
```json
{
  "balance": 10000.00
}
```

#### POST `/payments/initiate`
Initiate a UPI payment.

**Request:**
```json
{
  "amount": 100.00,
  "receiverVPA": "merchant@paytm",
  "receiverName": "Merchant Name",
  "note": "Payment for goods",
  "transactionId": "TXN1234567890",
  "checksum": "sha256-hash-of-transaction-data"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORDER_1234567890",
  "transactionId": "TXN1234567890",
  "status": "success",
  "amount": 100.00,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Rate Limit:** 20 payments per hour per IP

**Security Features:**
- Checksum validation
- Balance verification
- Duplicate transaction prevention
- Atomic transaction (rollback on failure)

#### GET `/transactions`
Get transaction history.

**Query Parameters:**
- `limit` (optional): Max results, default 50

**Response:**
```json
[
  {
    "transactionId": "TXN1234567890",
    "amount": 100.00,
    "receiverVPA": "merchant@paytm",
    "receiverName": "Merchant Name",
    "note": "Payment for goods",
    "status": "success",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:00:05.000Z"
  }
]
```

**Security:** RLS ensures users only see their own transactions

#### GET `/payments/verify/:transactionId`
Verify payment status.

**Response:**
```json
{
  "transactionId": "TXN1234567890",
  "amount": 100.00,
  "receiverVPA": "merchant@paytm",
  "receiverName": "Merchant Name",
  "note": "Payment for goods",
  "status": "success",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:00:05.000Z"
}
```

#### POST `/vpa/validate`
Validate a VPA (public endpoint).

**Request:**
```json
{
  "vpa": "merchant@paytm"
}
```

**Response:**
```json
{
  "valid": true,
  "name": "Merchant Name"
}
```

## 🔒 Security Best Practices

### Environment Variables

**NEVER commit `.env` to version control!**

1. Use `.env.example` as template
2. Generate strong secrets:
```bash
# JWT secrets (64 chars hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption key (32 chars hex for AES-256)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

3. Use different keys for dev/staging/production
4. Rotate keys every 90 days

### Database Security

**Row-Level Security (RLS):**
- Automatically enforced on all queries
- Users can only access their own data
- No application-level filtering needed

**Example:**
```javascript
// User context automatically set via middleware
await setUserContext(client, req.user.userId);

// This query only returns current user's transactions
const result = await client.query(
  'SELECT * FROM transactions WHERE user_id = $1',
  [req.user.userId]
);
```

### Rate Limiting

**Three tiers:**
1. **General API:** 100 requests/15 min
2. **Authentication:** 5 requests/5 min
3. **Payments:** 20 payments/hour

**Headers returned:**
- `RateLimit-Limit`: Max requests
- `RateLimit-Remaining`: Requests left
- `RateLimit-Reset`: Reset timestamp
- `Retry-After`: Seconds until retry (when limited)

### Audit Logging

**Logs location:**
- `logs/audit.log` - All events
- `logs/security.log` - Security-critical events only

**What's logged:**
- All authentication attempts (success/failure)
- All payment transactions
- Failed authorization attempts
- Invalid checksums
- Rate limit violations
- All API requests with timing

**Log format:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "SECURITY",
  "event": "LOGIN_FAILED",
  "data": {
    "userId": null,
    "success": false,
    "reason": "invalid_pin"
  },
  "request": {
    "ip": "192.168.1.1",
    "method": "POST",
    "path": "/auth/login",
    "userAgent": "..."
  }
}
```

## 🧪 Testing

### Security Testing

1. **Test Rate Limiting:**
```bash
# Should fail after 5 attempts
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"vpa":"test@finwise","upiPin":"wrong"}'
done
```

2. **Test RLS:**
```bash
# Try accessing another user's transaction
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/payments/verify/ANOTHER_USER_TXN
# Should return 404 Not Found
```

3. **Test Input Validation:**
```bash
# Invalid VPA format
curl -X POST http://localhost:3000/vpa/validate \
  -H "Content-Type: application/json" \
  -d '{"vpa":"invalid-vpa"}'
# Should return 400 Validation Error
```

4. **Test JWT Expiry:**
```bash
# Wait 16 minutes, then try using access token
curl -H "Authorization: Bearer <expired-token>" \
  http://localhost:3000/account/balance
# Should return 401 Token Expired
```

## 📊 Monitoring

### Log Monitoring

```bash
# Watch security events in real-time
tail -f logs/security.log

# Search for failed logins
grep "LOGIN_FAILED" logs/security.log

# Count rate limit violations
grep "Rate limit exceeded" logs/audit.log | wc -l
```

### Database Monitoring

```sql
-- Check audit log for recent changes
SELECT * FROM audit_log 
ORDER BY timestamp DESC 
LIMIT 100;

-- Find users with failed transactions
SELECT user_id, COUNT(*) as failed_count
FROM transactions 
WHERE status = 'failed'
GROUP BY user_id;
```

## 🚨 Incident Response

### If Breach Detected

1. **Immediate Actions:**
   ```bash
   # Rotate all JWT secrets
   # This invalidates all existing tokens
   
   # Update .env with new secrets
   JWT_SECRET=new-secret-here
   JWT_REFRESH_SECRET=new-secret-here
   
   # Restart server
   pm2 restart finwise-backend
   ```

2. **Investigation:**
   - Check `logs/security.log` for suspicious activity
   - Review database `audit_log` table
   - Identify compromised accounts

3. **User Notification:**
   - If user data exposed, notify within 72 hours (GDPR/DPDP)
   - Force password/PIN reset for affected users

4. **Post-Incident:**
   - Document findings
   - Update security measures
   - Conduct security review

## 📝 Production Deployment

### Checklist

- [ ] Environment variables set in production
- [ ] Database RLS policies applied
- [ ] SSL certificates configured
- [ ] Firewall rules configured
- [ ] Log rotation set up
- [ ] Monitoring alerts configured
- [ ] Backup schedule configured
- [ ] Disaster recovery plan documented

### Recommended Infrastructure

- **Hosting:** AWS EC2/ECS, Google Cloud Run, or DigitalOcean
- **Database:** Neon PostgreSQL (serverless, auto-scaling)
- **Load Balancer:** Nginx or AWS ALB
- **Monitoring:** Datadog, New Relic, or ELK stack
- **Secrets:** AWS Secrets Manager or HashiCorp Vault

## 🤝 Support

For security issues, please email: security@finwise.com

**DO NOT** create public GitHub issues for security vulnerabilities!

## 📄 License

MIT License - See LICENSE file for details
