# ✅ Crypto Integration Setup - Complete Guide

## 🎉 Setup Status

All 4 steps have been configured and are ready for testing!

### ✅ 1. SQL Migrations - COMPLETED

The following migrations have been successfully run on your NeonDB:

- **004_crypto_columns.sql** - Added crypto balance columns to users table:
  - `eth_balance` - ETH balance (DECIMAL 18,8)
  - `eth_balance_inr` - ETH balance in INR (DECIMAL 15,2)
  - `eth_wallet_address` - User's MetaMask address (VARCHAR 42)
  - `last_eth_sync` - Last blockchain sync timestamp

- **005_crypto_transactions.sql** - Created crypto_transactions table for tracking:
  - Purchase history
  - Transaction hashes
  - ETH prices at purchase time
  - OpenServ.ai job references

### ✅ 2. Environment Variables - CONFIGURED

Your `.env` file has been updated with the following sections:

#### **Required Configuration:**

```env
# ETHEREUM / WEB3 CONFIGURATION
# Choose ONE of these options:

# Option 1: Use Infura (Recommended)
INFURA_PROJECT_ID=your_infura_project_id_here
# Get from: https://infura.io/dashboard

# Option 2: Use Alchemy
# ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_alchemy_api_key
# Get from: https://www.alchemy.com/

# Server wallet for automated ETH purchases
ETH_SERVER_WALLET_ADDRESS=0xYourServerWalletAddress
ETH_SERVER_PRIVATE_KEY=your_private_key_without_0x_prefix

# OPENSERV.AI AGENT CONFIGURATION
OPENSERV_API_KEY=your_openserv_api_key_here
OPENSERV_AGENT_ID=your_agent_id_here
OPENSERV_WEBHOOK_SECRET=your_webhook_secret_for_signature_verification
# Get from: https://openserv.ai
```

#### **How to Get These Values:**

1. **Infura Project ID:**
   - Go to https://infura.io/
   - Create a free account
   - Create a new project
   - Copy the Project ID from the dashboard

2. **Server Wallet:**
   - Option A: Generate new wallet at https://vanity-eth.tk/
   - Option B: Export from MetaMask (Settings > Security & Privacy > Reveal Private Key)
   - ⚠️ **IMPORTANT:** Use a dedicated wallet for the server, not your personal wallet
   - Fund this wallet with enough ETH to cover user purchases

3. **OpenServ.ai Credentials:**
   - Go to https://openserv.ai/
   - Create an account and agent
   - Copy API Key and Agent ID from dashboard
   - Set up webhook secret for callback verification

### ✅ 3. MetaMask Wallet Address Endpoint - READY

The API endpoint for users to set their MetaMask address is already implemented:

**Endpoint:** `POST /api/crypto/wallet/address`

**Request:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ethereum wallet address saved",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Example Usage:**
```bash
curl -X POST http://localhost:3000/api/crypto/wallet/address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

**Mobile App Integration:**
```typescript
// In your React Native app
import { api } from './services/api';

async function setWalletAddress(address: string) {
  try {
    const response = await api.post('/crypto/wallet/address', {
      walletAddress: address
    });
    console.log('Wallet set:', response.data);
  } catch (error) {
    console.error('Failed to set wallet:', error);
  }
}
```

### ✅ 4. Automatic ETH Purchase Trigger - INTEGRATED

The automatic ETH purchase is **already integrated** in the UPI Lite transfer endpoint!

**Workflow:**
1. User transfers money from Bank → UPI Lite
2. System detects UPI Lite balance increase
3. **Automatically triggers ETH purchase** via OpenServ.ai agent
4. ETH is sent to user's MetaMask wallet
5. Balance is updated in database

**Implementation Location:**
`backend/routes/wallet.js` (lines 445-465)

```javascript
// HOOK: Trigger ETH purchase workflow when UPI Lite balance increases
const newUpiLiteBalance = parseFloat(result.rows[0].upi_lite_balance);
try {
  const ethPurchaseResult = await openservAgent.processUpiLiteBalanceChange(
    req.user.userId,
    previousUpiLiteBalance,
    newUpiLiteBalance
  );
  if (ethPurchaseResult) {
    logTransaction('ETH_AUTO_PURCHASE', {
      userId: req.user.userId,
      upiLiteChange: amount,
      ethPurchased: ethPurchaseResult.ethPurchased,
      txHash: ethPurchaseResult.transactionHash
    }, req);
  }
} catch (ethError) {
  // Log but don't fail the transfer if ETH purchase fails
  console.error('ETH auto-purchase failed:', ethError);
  logError(ethError, req);
}
```

**Features:**
- ✅ Automatic conversion from INR to ETH
- ✅ Real-time ETH price fetching from CoinGecko
- ✅ Transaction logging in `crypto_transactions` table
- ✅ Balance updates in `users.eth_balance`
- ✅ Error handling (transfer succeeds even if ETH purchase fails)
- ✅ OpenServ.ai integration with local fallback

---

## 🚀 Testing the Complete Flow

### Step 1: Configure Environment Variables

1. Edit `backend/.env` and fill in:
   - `INFURA_PROJECT_ID` or `ETH_RPC_URL`
   - `ETH_SERVER_WALLET_ADDRESS`
   - `ETH_SERVER_PRIVATE_KEY`
   - `OPENSERV_API_KEY` (optional - will fallback to local execution)
   - `OPENSERV_AGENT_ID` (optional)

### Step 2: Restart the Backend Server

```bash
cd backend
node server.js
```

Look for these confirmation messages:
```
✓ Web3 initialized for Ethereum network
✓ OpenServ.ai agent service initialized
✓ Razorpay initialized successfully
```

### Step 3: Set User's MetaMask Address

```bash
# Login first to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210", "pin": "1234"}'

# Use the token to set wallet address
curl -X POST http://localhost:3000/api/crypto/wallet/address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

### Step 4: Test UPI Lite Transfer (Triggers ETH Purchase)

```bash
# Transfer ₹100 from Bank to UPI Lite
curl -X POST http://localhost:3000/api/wallet/transfer-to-upi-lite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 100}'
```

**Expected Response:**
```json
{
  "success": true,
  "bankBalance": 900.00,
  "upiLiteBalance": 100.00,
  "message": "₹100 transferred to UPI Lite"
}
```

**Check Server Logs for ETH Purchase:**
```
[OpenServ Workflow] Processing ETH purchase for user abc123...
[OpenServ Workflow] UPI Lite balance changed: ₹0 -> ₹100
[OpenServ Workflow] Amount to convert: ₹100
[OpenServ Workflow] ETH Price: ₹234567.89, ETH Amount: 0.00042653
[OpenServ Workflow] ETH Purchase successful: 0x1234...
[OpenServ Workflow] Completed: { success: true, ... }
```

### Step 5: Verify ETH Balance

```bash
# Check crypto balance
curl -X GET http://localhost:3000/api/crypto/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "ethBalance": 0.00042653,
  "ethBalanceInr": 100.00,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "lastSync": "2025-11-29T12:34:56.789Z",
  "currentEthPrice": 234567.89,
  "liveValueInr": 100.00
}
```

---

## 📱 Mobile App Integration

### Setting Wallet Address in React Native

```typescript
// app/crypto-setup.tsx
import { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { api } from '@/services/api';

export default function CryptoSetup() {
  const [walletAddress, setWalletAddress] = useState('');
  
  const handleSetWallet = async () => {
    try {
      const response = await api.post('/crypto/wallet/address', {
        walletAddress
      });
      Alert.alert('Success', 'Wallet address saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to set wallet address');
    }
  };
  
  return (
    <View>
      <TextInput
        placeholder="0x..."
        value={walletAddress}
        onChangeText={setWalletAddress}
      />
      <Button title="Set Wallet" onPress={handleSetWallet} />
    </View>
  );
}
```

### Displaying ETH Balance

```typescript
// Add to your wallet screen
const [cryptoBalance, setCryptoBalance] = useState(null);

useEffect(() => {
  const fetchCryptoBalance = async () => {
    try {
      const response = await api.get('/crypto/balance');
      setCryptoBalance(response.data);
    } catch (error) {
      console.error('Failed to fetch crypto balance:', error);
    }
  };
  
  fetchCryptoBalance();
}, []);

// Display in UI
<Text>ETH Balance: {cryptoBalance?.ethBalance} ETH</Text>
<Text>≈ ₹{cryptoBalance?.ethBalanceInr}</Text>
```

---

## 🔧 Additional API Endpoints

### Get Current ETH Price
```bash
GET /api/crypto/price
```

### Calculate ETH for INR Amount
```bash
GET /api/crypto/calculate?amount=100
```

### Sync Balance from Blockchain
```bash
POST /api/crypto/balance/sync
```

### Get Transaction History
```bash
GET /api/crypto/transactions
```

---

## 🔍 Troubleshooting

### "Web3 not initialized" Error
- Check that `INFURA_PROJECT_ID` or `ETH_RPC_URL` is set in `.env`
- Restart the server after updating `.env`

### "Server wallet not configured" Error
- Set `ETH_SERVER_WALLET_ADDRESS` and `ETH_SERVER_PRIVATE_KEY` in `.env`
- Ensure the private key is without the `0x` prefix

### ETH Purchase Fails Silently
- Check server logs for detailed error messages
- Verify server wallet has sufficient ETH balance
- Check Infura/Alchemy API limits

### OpenServ.ai Integration Issues
- If `OPENSERV_API_KEY` is not set, the system will fallback to local execution
- Local execution works fine for testing and production
- OpenServ.ai is optional but provides better monitoring and workflow management

---

## 🎯 Success Criteria

You've successfully set up crypto integration when:

1. ✅ Migrations run without errors
2. ✅ Server starts with "Web3 initialized" message
3. ✅ Users can set their MetaMask address via API
4. ✅ Transferring to UPI Lite automatically purchases ETH
5. ✅ ETH balance updates in the database
6. ✅ Transaction hash is logged in `crypto_transactions` table

---

## 📚 Next Steps

1. **Mobile UI:** Create screens for:
   - Setting MetaMask wallet address
   - Viewing ETH balance
   - Transaction history

2. **Security:**
   - Implement rate limiting on crypto endpoints
   - Add transaction limits
   - Set up monitoring and alerts

3. **Features:**
   - Add ETH to INR conversion (selling ETH)
   - Support multiple cryptocurrencies
   - Integrate DeFi features

---

## 🤝 Support

For issues or questions:
- Check the logs in `backend/logs/`
- Review `docs/CRYPTO_INTEGRATION.md` for detailed documentation
- Test each endpoint individually using the curl commands above

**Everything is ready to go! Just fill in the environment variables and start testing! 🚀**
