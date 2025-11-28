# Security Guidelines for FinWise UPI Payment App

## 🔐 Security Architecture

This document outlines the security measures implemented in FinWise and best practices for production deployment.

## ✅ Implemented Security Features

### 1. JWT Authentication & Authorization

**Implementation:**
- RS256-ready JWT tokens with access/refresh pattern
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Secure token generation with proper claims
- Token verification middleware for protected routes

**Files:**
- `backend/middleware/auth.js` - JWT auth middleware
- Environment variables: `JWT_SECRET`, `JWT_REFRESH_SECRET`

### 2. Row-Level Security (RLS)

**Database-Level Isolation:**
- PostgreSQL RLS policies enforce data isolation
- Users can only access their own transactions
- Automatic context setting per request
- Audit triggers log all data modifications

**Implementation:**
```sql
-- Set user context for each request
SELECT set_config('app.current_user_id', user_id, false);
-- All queries automatically filtered by RLS policies
```

**Files:**
- `backend/schema-rls.sql` - RLS policies and audit triggers

### 3. Rate Limiting

**Protection Against Brute Force:**
- General API: 100 requests/15 min per IP
- Authentication endpoints: 5 requests/5 min per IP
- Payment endpoints: 20 requests/hour per IP
- Automatic suspicious activity logging

**Files:**
- `backend/middleware/rateLimiter.js`

### 4. Comprehensive Audit Logging

**Security Event Tracking:**
- All authentication attempts logged
- Payment transactions tracked
- Failed access attempts flagged
- Separate security log for critical events
- Request/response duration monitoring

**Files:**
- `backend/middleware/auditLogger.js`
- Logs: `backend/logs/audit.log`, `backend/logs/security.log`

### 5. Input Validation & Sanitization

**Prevention of Injection Attacks:**
- Express-validator for all inputs
- VPA format validation
- Amount range checks (₹1 - ₹100,000)
- Transaction ID format enforcement
- SQL injection prevention via parameterized queries
- XSS prevention with input escaping

**Files:**
- `backend/middleware/validator.js`

### 6. Data Encryption

**Client-Side Encryption**
- All sensitive data encrypted using AES-256
- Encryption keys from environment variables (REQUIRED)
- No plain-text storage of UPI PINs or payment data
- Runtime validation ensures encryption key is set

**Implementation:**
```typescript
// utils/security.ts
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('Encryption key must be set');
}
```

**Server-Side Security**
- UPI PINs hashed with bcrypt (12 rounds)
- Checksums for transaction integrity
- SSL/TLS enforcement for database connections
- Secure session management

### 7. Secure Storage

**Expo SecureStore**
- Uses iOS Keychain and Android Keystore
- Hardware-backed encryption on supported devices
- Auto-deletes on app uninstall

**What We Store Securely:**
- Authentication tokens
- User session data
- Encrypted transaction history
- User preferences

**What We NEVER Store:**
- Plain-text UPI PINs
- CVV numbers
- OTPs
- Full card numbers

### 8. Multi-Factor Authentication

**Multi-Factor Authentication (2FA)**
1. UPI PIN (4-6 digits)
2. Biometric authentication (Face ID/Touch ID/Fingerprint)
3. Device binding

**PIN Security:**
- Client-side hashing before transmission
- Server-side bcrypt hashing
- Rate limiting on PIN entry attempts
- Account lockout after failed attempts

### 9. Network Security

**HTTPS Only**
- All API calls use HTTPS/TLS 1.3
- Certificate pinning for production
- No mixed content allowed
- Helmet.js security headers:
  - HSTS (HTTP Strict Transport Security)
  - Content Security Policy (CSP)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection enabled

**API Security:**
```typescript
// services/api.ts
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 10. Transaction Security

**Checksum Verification**
- Every transaction includes SHA-256 checksum
- Server validates before processing
- Prevents tampering

**Example:**
```typescript
const generateChecksum = (data: any): string => {
  const payload = JSON.stringify(data);
  return hashData(payload);
};
```

**Idempotency**
- Unique transaction IDs prevent duplicates
- Server tracks processed transactions
- Safe retry mechanism

### 11. CORS & CSRF Protection

**Cross-Origin Security:**
- Configured CORS whitelist from environment
- Credentials support enabled
- Cookie-based CSRF protection ready

**Implementation:**
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
};
```

### 12. Input Validation

**Client-Side:**
- VPA format validation
- Amount range checks
- XSS prevention
- SQL injection prevention

**Server-Side:**
- All inputs sanitized
- Type checking
- Length limits
- Whitelist validation

### 13. QR Code Security

**Validation:**
- Format verification (UPI standard)
- Malicious URL detection
- Amount limit checks
- Merchant verification

**Safe Scanning:**
```typescript
const parseUPIQR = (qrString: string): any => {
  if (!qrString.startsWith('upi://pay')) {
    throw new Error('Invalid UPI QR code');
  }
  // Parse and validate
};
```

## Production Security Checklist

### Pre-Deployment

- [x] **Environment Variables**
  - ✅ All secrets in .env files (see .env.example)
  - ✅ Encryption keys required in production
  - ✅ JWT secrets validated at startup
  - [ ] Use different keys for dev/staging/prod
  - [ ] Rotate keys regularly

- [x] **Code Audit**
  - ✅ No hardcoded credentials
  - ✅ Encryption key from environment only
  - ✅ UPI PINs hashed with bcrypt
  - [ ] Remove console.logs with sensitive data
  - [ ] Minimize dependencies
  - [ ] Update all packages

- [x] **API Security**
  - ✅ Rate limiting implemented (3 tiers)
  - ✅ CORS configured with whitelist
  - ✅ Helmet.js security headers
  - ✅ Input validation on all endpoints
  - [ ] Use API gateway in production
  - [ ] Add request signing

- [ ] **Certificate Pinning**
  ```typescript
  // Enable SSL pinning
  const pins = {
    'api.finwise.com': {
      includeSubdomains: true,
      pins: ['sha256/AAAAAAA...', 'sha256/BBBBBBB...'],
    },
  };
  ```

- [x] **Database Security**
  - ✅ Row-Level Security (RLS) policies
  - ✅ Prepared statements (parameterized queries)
  - ✅ SSL/TLS enforced (rejectUnauthorized: true)
  - ✅ Audit triggers on all tables
  - ✅ Connection pooling with limits
  - [ ] Encrypt data at rest (enable in Neon settings)
  - [ ] Regular backups configured
  - [ ] Set up read-only replicas

### Monitoring

- [x] **Logging**
  - ✅ Comprehensive audit logging implemented
  - ✅ All transactions logged
  - ✅ Failed authentication tracked
  - ✅ Security events in separate log file
  - ✅ Request/response timing logged
  - [ ] Set up log rotation
  - [ ] Integrate with monitoring service (ELK, Datadog)
  - [ ] Configure real-time alerts

- [x] **Intrusion Detection**
  - ✅ Rate limiting prevents brute force
  - ✅ Failed auth attempts logged to security.log
  - ✅ Invalid checksums flagged
  - ✅ Duplicate transactions blocked
  - [ ] Implement IP-based blocking
  - [ ] Add geo-location checks
  - [ ] Device fingerprinting
  - [ ] Anomaly detection ML model

### Compliance

- [ ] **RBI Guidelines**
  - Two-factor authentication mandatory
  - Transaction limits
  - Customer verification (KYC)
  - Dispute resolution

- [ ] **PCI DSS**
  - Secure card data handling
  - Network segmentation
  - Regular security testing
  - Access control

- [ ] **Data Privacy**
  - DPDP Act (India) compliance
  - User consent management
  - Right to deletion
  - Data minimization

- [ ] **NPCI Certification**
  - UPI specifications adherence
  - Security audit
  - Penetration testing
  - Regular updates

## Security Incident Response

### 1. Detection
- Automated monitoring alerts
- User reports
- Security team reviews

### 2. Containment
- Isolate affected systems
- Revoke compromised credentials
- Block suspicious IPs

### 3. Investigation
- Analyze logs
- Identify breach scope
- Document findings

### 4. Recovery
- Patch vulnerabilities
- Restore from backups
- Reset credentials

### 5. Post-Incident
- User notification (if required)
- Regulatory reporting
- Update security measures

## Security Implementation Summary

### What's Implemented ✅

1. **JWT Authentication**: Full access/refresh token system
2. **Row-Level Security**: Database-level data isolation
3. **Rate Limiting**: 3-tier protection (general, auth, payment)
4. **Audit Logging**: Comprehensive security event tracking
5. **Input Validation**: Express-validator on all endpoints
6. **Encryption**: Environment-based key management
7. **Security Headers**: Helmet.js with HSTS, CSP, etc.
8. **CORS Protection**: Whitelist-based origin control
9. **Password Hashing**: bcrypt with 12 rounds
10. **SSL/TLS Enforcement**: Strict certificate validation

### Required Setup Steps

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Apply Database Migrations**:
   ```bash
   # First run the base schema
   npm run setup-db
   
   # Then apply RLS policies
   psql $DATABASE_URL -f schema-rls.sql
   ```

4. **Generate Secure Keys**:
   ```bash
   # Generate JWT secrets (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate encryption key (exactly 32 characters for AES-256)
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

5. **Start Server**:
   ```bash
   npm start
   ```

### Security Testing Checklist

- [ ] Test rate limiting by exceeding limits
- [ ] Verify JWT token expiration and refresh
- [ ] Test RLS by attempting cross-user data access
- [ ] Check audit logs for all events
- [ ] Verify input validation with malformed data
- [ ] Test CORS with unauthorized origins
- [ ] Attempt SQL injection on all endpoints
- [ ] Try XSS attacks on input fields
- [ ] Verify SSL/TLS certificate validation
- [ ] Test transaction checksum validation

## Regular Security Tasks

**Daily:**
- Monitor `logs/security.log` for suspicious activity
- Review failed authentication attempts
- Check rate limit violations
- Monitor `logs/audit.log` for anomalies

**Weekly:**
- Run `npm audit` and fix vulnerabilities
- Review access patterns in audit logs
- Check for unusual transaction volumes
- Backup verification

**Monthly:**
- Rotate JWT secrets
- Update all dependencies
- Security penetration testing
- Review and update RLS policies
- Access review and cleanup

**Quarterly:**
- Full compliance audit (RBI, NPCI, PCI DSS)
- Security training for team
- Disaster recovery drill
- Third-party security assessment
- Encryption key rotation

## Developer Guidelines

### Do's ✅
- Use TypeScript for type safety
- Validate all inputs
- Use parameterized queries
- Implement proper error handling
- Log security events
- Keep dependencies updated
- Use linters and formatters
- Review code before merging

### Don'ts ❌
- Never log sensitive data
- Don't store secrets in code
- Avoid using `any` type
- Don't trust user input
- Never disable security features
- Don't use deprecated libraries
- Avoid complex logic in views
- Don't skip security reviews

## Security Contact

For security issues or vulnerabilities:
- Email: security@finwise.com
- Bug Bounty: https://finwise.com/security/bounty
- PGP Key: Available on website

## Resources

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [RBI Guidelines](https://www.rbi.org.in/)
- [NPCI Documentation](https://www.npci.org.in/what-we-do/upi/product-overview)
- [PCI DSS Standards](https://www.pcisecuritystandards.org/)

---

**Last Updated:** 2024
**Review Frequency:** Quarterly
**Next Review:** [Date]
