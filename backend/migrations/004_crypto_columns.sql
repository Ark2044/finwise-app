-- Migration: Add cryptocurrency balance columns to users table
-- Run this migration to add ETH balance tracking

-- Add eth_balance column (stores ETH balance in ETH units)
ALTER TABLE users ADD COLUMN IF NOT EXISTS eth_balance DECIMAL(18, 8) DEFAULT 0.00000000;

-- Add eth_balance_inr column (stores ETH balance equivalent in INR)
ALTER TABLE users ADD COLUMN IF NOT EXISTS eth_balance_inr DECIMAL(15, 2) DEFAULT 0.00;

-- Add wallet_address column (stores the user's Ethereum wallet address)
ALTER TABLE users ADD COLUMN IF NOT EXISTS eth_wallet_address VARCHAR(42);

-- Add last_eth_sync timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_eth_sync TIMESTAMP;

-- Create index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_users_eth_wallet ON users(eth_wallet_address);

-- Add comment for documentation
COMMENT ON COLUMN users.eth_balance IS 'Ethereum balance in ETH units';
COMMENT ON COLUMN users.eth_balance_inr IS 'Ethereum balance equivalent in INR';
COMMENT ON COLUMN users.eth_wallet_address IS 'User Ethereum wallet address (0x...)';
COMMENT ON COLUMN users.last_eth_sync IS 'Last time ETH balance was synced from blockchain';
