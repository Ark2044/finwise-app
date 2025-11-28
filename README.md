# FinWise - Production-Ready UPI Payment App

A secure, feature-rich UPI payment application built with React Native (Expo) and Node.js backend. Supports QR code scanning, instant payments, transaction history, and industry-standard security practices.

## 🚀 Features

### Mobile App
- 📱 **QR Code Scanner**: Scan UPI QR codes with camera
- 💸 **Instant Payments**: Send money via UPI with PIN/biometric authentication
- 📊 **Transaction History**: View all past transactions with status
- 🔐 **Secure Authentication**: UPI PIN entry with biometric fallback
- 💰 **Balance Display**: Real-time account balance
- 🎨 **Modern UI**: Clean, intuitive interface with smooth animations
- 🔔 **Haptic Feedback**: Tactile responses for key actions

### Security Features
- 🔒 AES-256 encryption for sensitive data
- 🔑 Secure storage using Expo SecureStore
- 👁️ Biometric authentication (Face ID/Touch ID)
- ✅ Transaction checksum verification
- 🛡️ Input validation and sanitization

## 📋 Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Backend server (Node.js/Express)

## 🛠️ Installation

### Mobile App

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm start
```

3. **Run on device/simulator:**
```bash
# iOS
npm run ios

# Android
npm run android

# Web (for testing only)
npm run web
```

### Backend Server

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Start server:**
```bash
npm start
```

The backend will run on `http://localhost:3000`

## 🔧 Configuration

### Payment Gateway Setup

This app supports multiple payment gateways. Choose one:

#### Option 1: Razorpay
1. Sign up at [Razorpay](https://razorpay.com/)
2. Get API keys from dashboard
3. Add to `backend/.env`:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret
```

#### Option 2: PhonePe
1. Register as merchant at [PhonePe Business](https://business.phonepe.com/)
2. Get merchant credentials
3. Add to `backend/.env`:
```env
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
```

### Database Setup (PostgreSQL)

1. **Install PostgreSQL**

2. **Create database:**
```sql
CREATE DATABASE finwise;
```

3. **Run migrations:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  vpa VARCHAR(255) UNIQUE NOT NULL,
  mobile_number VARCHAR(15) UNIQUE NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  upi_pin_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  receiver_vpa VARCHAR(255) NOT NULL,
  receiver_name VARCHAR(255),
  transaction_note TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  transaction_ref VARCHAR(255),
  payment_method VARCHAR(50) DEFAULT 'UPI',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_transactions ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transaction_id ON transactions(transaction_id);
```

## 📱 App Structure

```
finwise-app/
├── app/                      # App screens (Expo Router)
│   ├── (tabs)/              # Tab navigation
│   │   ├── index.tsx        # Home dashboard
│   │   └── explore.tsx      # Transaction history
│   ├── scan-pay.tsx         # QR scanner screen
│   ├── payment-confirm.tsx  # Payment confirmation
│   ├── payment-processing.tsx # Payment processing
│   └── transactions.tsx     # Full transaction list
├── components/              # Reusable components
│   ├── payment/            # Payment-specific components
│   │   ├── QRScanner.tsx   # QR code scanner
│   │   └── PINInput.tsx    # UPI PIN input
│   └── ui/                 # UI components
├── context/                # React Context
│   └── PaymentContext.tsx  # Payment state management
├── services/               # API services
│   └── api.ts             # Backend API integration
├── utils/                  # Utility functions
│   └── security.ts        # Security utilities
├── types/                  # TypeScript types
│   └── upi.ts             # UPI-related types
└── backend/               # Node.js backend
    ├── server.js          # Express server
    └── package.json       # Backend dependencies
```

## 🔐 Security Best Practices

1. **Never store UPI PINs in plain text** - Always hash using bcrypt or similar
2. **Use HTTPS** for all API communications in production
3. **Implement rate limiting** to prevent brute force attacks
4. **Validate all inputs** on both client and server side
5. **Use environment variables** for sensitive configuration
6. **Enable 2FA** for production deployments
7. **Regular security audits** and dependency updates
8. **Log monitoring** for suspicious activities

## 🚀 Production Deployment

### Mobile App (via EAS)

1. **Install EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Configure EAS:**
```bash
eas build:configure
```

3. **Build for iOS:**
```bash
eas build --platform ios
```

4. **Build for Android:**
```bash
eas build --platform android
```

### Backend Deployment

Recommended platforms:
- **AWS EC2/ECS** - Scalable, production-ready
- **Heroku** - Quick deployment, easy scaling
- **DigitalOcean App Platform** - Simple, affordable
- **Google Cloud Run** - Serverless, auto-scaling

## 📄 API Documentation

### Payment Endpoints

#### POST `/payments/initiate`
Initiate a new UPI payment
```json
{
  "amount": 100.00,
  "receiverVPA": "user@bank",
  "receiverName": "John Doe",
  "note": "Payment for dinner",
  "transactionId": "TXN123456",
  "checksum": "abc123..."
}
```

#### GET `/payments/verify/:transactionId`
Verify payment status

#### GET `/transactions`
Get transaction history

#### POST `/vpa/validate`
Validate UPI VPA

## 🧪 Testing

### Test UPI IDs (Demo)
- Valid: `demo@finwise`, `test@paytm`, `merchant@phonepe`
- Invalid: `invalid@xyz`

### Test QR Codes
Generate test UPI QR codes:
```
upi://pay?pa=demo@finwise&pn=Demo%20Merchant&am=100.00&cu=INR&tn=Test%20Payment
```

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/finwise-app/issues)
- Email: support@finwise.com

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) - React Native framework
- [Razorpay](https://razorpay.com/) - Payment gateway
- [NPCI](https://www.npci.org.in/) - UPI infrastructure

---

**⚠️ Important**: This is a demo application for educational purposes. For production use, ensure compliance with:
- RBI guidelines
- NPCI certification requirements
- PCI DSS standards
- Data privacy laws (DPDP Act, GDPR)
