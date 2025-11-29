# Crypto Integration - UPI Lite to Ethereum

This document describes the workflow that automatically purchases Ethereum when the UPI Lite balance changes.

## Overview

When a user transfers money to their UPI Lite wallet, the system automatically:
1. Detects the balance change
2. Triggers an OpenServ.ai agent (or local fallback)
3. Purchases equivalent ETH using the INR amount
4. Updates the user's `eth_balance` and `eth_balance_inr` columns in the database

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Action   │────>│   wallet.js      │────>│  OpenServ.ai    │
│ (Transfer to    │     │   (Hook)         │     │  Agent          │
│  UPI Lite)      │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          v
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   PostgreSQL    │<────│  cryptoWallet.js │<────│  Local Fallback │
│   (NeonDB)      │     │  (Web3.js)       │     │  (if OpenServ   │
│                 │     │                  │     │   unavailable)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Setup

### 1. Run Database Migrations

```sql
-- Run these migrations in your NeonDB console
\i backend/migrations/004_crypto_columns.sql
\i backend/migrations/005_crypto_transactions.sql
```

### 2. Configure Environment Variables

Add these to your `.env` file (see `.env.crypto.example`):

```bash
# Ethereum RPC (Infura/Alchemy)
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# Server wallet for automated purchases
ETH_SERVER_PRIVATE_KEY=0x...
ETH_SERVER_WALLET_ADDRESS=0x...

# OpenServ.ai
OPENSERV_API_KEY=your_api_key
OPENSERV_AGENT_ID=your_agent_id
```

### 3. Install Dependencies

```bash
cd backend
npm install web3
```

### 4. Set Up User's MetaMask Wallet

Users need to save their MetaMask wallet address:

```bash
curl -X POST http://localhost:3000/crypto/wallet/address \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xYourMetaMaskAddress"}'
```

## API Endpoints

### Crypto Routes (`/crypto`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crypto/balance` | Get user's ETH balance and wallet info |
| POST | `/crypto/wallet/address` | Set user's MetaMask wallet address |
| POST | `/crypto/balance/sync` | Sync ETH balance from blockchain |
| GET | `/crypto/price` | Get current ETH price in INR |
| GET | `/crypto/calculate?amount=1000` | Calculate ETH for given INR |
| POST | `/crypto/purchase` | Manual ETH purchase |
| GET | `/crypto/transactions` | Get crypto transaction history |
| POST | `/crypto/webhook/openserv` | OpenServ.ai webhook callback |

## Workflow Details

### Automatic Purchase Flow

1. User calls `POST /wallet/transfer-to-upi-lite` with amount
2. Bank balance decreases, UPI Lite balance increases
3. Hook in `wallet.js` calls `openservAgent.processUpiLiteBalanceChange()`
4. OpenServ.ai agent is triggered (or local fallback executes)
5. Current ETH price is fetched from CoinGecko
6. ETH is purchased (transferred from server wallet)
7. Database is updated with new ETH balance
8. Transaction is logged in `crypto_transactions` table

### Manual Purchase

```bash
curl -X POST http://localhost:3000/crypto/purchase \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountINR": 1000}'
```

## Database Schema

### New Columns in `users` Table

| Column | Type | Description |
|--------|------|-------------|
| `eth_balance` | DECIMAL(18,8) | ETH balance in ETH units |
| `eth_balance_inr` | DECIMAL(15,2) | ETH balance in INR |
| `eth_wallet_address` | VARCHAR(42) | User's MetaMask address |
| `last_eth_sync` | TIMESTAMP | Last blockchain sync time |

### `crypto_transactions` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `transaction_type` | VARCHAR | PURCHASE, SELL, etc. |
| `amount_inr` | DECIMAL | INR amount |
| `amount_eth` | DECIMAL | ETH amount |
| `eth_price` | DECIMAL | ETH price at transaction time |
| `tx_hash` | VARCHAR | Ethereum transaction hash |
| `status` | VARCHAR | pending, completed, failed |

## OpenServ.ai Agent Setup

1. Log in to [OpenServ.ai](https://openserv.ai)
2. Create a new agent with the following capabilities:
   - HTTP API calls (for ETH price fetching)
   - Database integration (for balance updates)
   - Web3 actions (for ETH transactions)
3. Configure the webhook URL to point to your server
4. Copy the Agent ID and API Key to your `.env` file

## Security Considerations

⚠️ **Important Security Notes:**

1. **Private Key Storage**: Never commit the server wallet private key to git. Use environment variables or a secrets manager.

2. **Server Wallet**: The server wallet should only hold enough ETH for expected transactions. Implement alerts for low balance.

3. **Rate Limiting**: The crypto endpoints use `paymentLimiter` to prevent abuse.

4. **Transaction Verification**: Always verify transaction hashes on the blockchain.

5. **Testnet First**: Use Sepolia testnet during development before mainnet.

## Testing

### Using Testnet

1. Set `ETH_RPC_URL` to Sepolia testnet
2. Get test ETH from a faucet
3. Use test MetaMask wallet addresses

### Simulated Mode

If the actual ETH purchase fails (e.g., no server wallet configured), the system falls back to simulated mode, which:
- Records the transaction with a `sim_` prefixed hash
- Updates balances based on current ETH price
- Marks the transaction as `simulated: true`

## Troubleshooting

### Common Issues

1. **"Web3 not initialized"**: Check your `ETH_RPC_URL` configuration
2. **"Server wallet not configured"**: Set `ETH_SERVER_PRIVATE_KEY` and `ETH_SERVER_WALLET_ADDRESS`
3. **"OpenServ.ai not initialized"**: Set `OPENSERV_API_KEY` (will fallback to local execution)
4. **"No Ethereum wallet address configured"**: User needs to call `/crypto/wallet/address` first
