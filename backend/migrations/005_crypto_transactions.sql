-- Migration: Create crypto_transactions table for ETH purchase logging

CREATE TABLE IF NOT EXISTS crypto_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- PURCHASE, SELL, TRANSFER_IN, TRANSFER_OUT
    amount_inr DECIMAL(15, 2) NOT NULL,
    amount_eth DECIMAL(18, 8) NOT NULL,
    eth_price DECIMAL(15, 2) NOT NULL, -- ETH price in INR at time of transaction
    tx_hash VARCHAR(66), -- Ethereum transaction hash (0x + 64 hex chars)
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    error_message TEXT,
    openserv_job_id VARCHAR(255), -- OpenServ.ai job reference
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_tx_user ON crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_created ON crypto_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_hash ON crypto_transactions(tx_hash);

-- Add comments
COMMENT ON TABLE crypto_transactions IS 'Log of all cryptocurrency transactions';
COMMENT ON COLUMN crypto_transactions.tx_hash IS 'Ethereum blockchain transaction hash';
COMMENT ON COLUMN crypto_transactions.eth_price IS 'ETH price in INR at time of transaction';
