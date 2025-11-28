-- FinWise UPI Payment System Database Schema
-- PostgreSQL 14+
-- Combined Schema: Base + UPI Profiles + Analytics + RLS + Migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Base Tables
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id VARCHAR(255) UNIQUE, -- Stores Neon/External Auth ID (Optional now)
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255), -- Added for local auth
    mobile_number VARCHAR(15) UNIQUE, -- Made optional for Neon auth flow
    vpa VARCHAR(255) UNIQUE NOT NULL,
    upi_pin_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    upi_lite_balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (upi_lite_balance >= 0),
    status VARCHAR(50) DEFAULT 'active',
    kyc_verified BOOLEAN DEFAULT FALSE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure auth_id column exists (for migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_id') THEN
        ALTER TABLE users ADD COLUMN auth_id VARCHAR(255) UNIQUE;
    END IF;
    
    -- Make mobile_number optional if it is currently NOT NULL
    ALTER TABLE users ALTER COLUMN mobile_number DROP NOT NULL;

    -- Add password_hash if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
END $$;

-- Index for Auth ID lookup
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    receiver_vpa VARCHAR(255) NOT NULL,
    receiver_name VARCHAR(255),
    transaction_note TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    transaction_ref VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'UPI',
    checksum VARCHAR(255),
    
    -- Analytics columns
    mcc VARCHAR(10),
    category VARCHAR(50),
    merchant_type VARCHAR(100),
    transaction_hour INTEGER,
    transaction_day_of_week INTEGER,
    is_impulse_purchase BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes for Base Tables
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_balances ON users(balance, upi_lite_balance);

-- ==========================================
-- 2. UPI Profiles (REMOVED - Consolidated into users table)
-- ==========================================

-- (Table definition removed to prevent redundancy)

-- ==========================================
-- 3. Financial Analytics Tables
-- ==========================================

-- Spending buckets summary table
CREATE TABLE IF NOT EXISTS spending_buckets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    average_transaction DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    percentage_of_total DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    trend VARCHAR(20) DEFAULT 'stable', -- increasing, decreasing, stable
    last_month_amount DECIMAL(15, 2) DEFAULT 0.00,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Financial DNA profiles
CREATE TABLE IF NOT EXISTS financial_dna (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_at TIMESTAMP DEFAULT NOW(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Spending Analysis
    total_spent DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    average_daily_spend DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    highest_spend_day VARCHAR(20),
    highest_spend_amount DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Income Analysis
    total_income DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    average_monthly_income DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    income_frequency VARCHAR(20) DEFAULT 'regular', -- regular, irregular, gig
    income_variability DECIMAL(5, 2) DEFAULT 0.00, -- 0-100 scale
    savings_rate DECIMAL(5, 2) DEFAULT 0.00, -- percentage
    
    -- Behavioral Patterns
    spending_velocity DECIMAL(5, 2) NOT NULL DEFAULT 0.00, -- transactions per day
    impulse_purchase_ratio DECIMAL(5, 2) DEFAULT 0.00,
    peak_spending_hours INTEGER[] DEFAULT '{}',
    peak_spending_days VARCHAR(20)[] DEFAULT '{}',
    
    -- Risk Indicators
    overdraft_risk VARCHAR(20) DEFAULT 'low', -- low, medium, high
    budget_adherence INTEGER DEFAULT 100, -- 0-100 score
    unusual_activity_flags TEXT[] DEFAULT '{}',
    
    -- Goals & Context
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    monthly_budget DECIMAL(15, 2),
    savings_goal DECIMAL(15, 2),
    emergency_fund_months DECIMAL(3, 1) DEFAULT 0.0,
    
    UNIQUE(user_id, period_start, period_end)
);

-- Top merchants for each user
CREATE TABLE IF NOT EXISTS top_merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    average_transaction DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    category VARCHAR(50),
    merchant_type VARCHAR(100),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, merchant_name, period_start, period_end)
);

-- AI Coaching interactions log
CREATE TABLE IF NOT EXISTS ai_coaching_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    request_type VARCHAR(50) NOT NULL, -- transaction_advice, spending_analysis, etc.
    user_query TEXT,
    ai_advice TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- info, warning, alert
    action_items TEXT[] DEFAULT '{}',
    related_insights TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- User financial goals
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- savings, budget, emergency_fund, debt_reduction
    goal_name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(15, 2),
    current_amount DECIMAL(15, 2) DEFAULT 0.00,
    target_date DATE,
    category VARCHAR(50), -- for budget goals
    is_active BOOLEAN DEFAULT TRUE,
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Income tracking
CREATE TABLE IF NOT EXISTS income_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    source VARCHAR(255) NOT NULL, -- salary, freelance, business, etc.
    source_type VARCHAR(50) NOT NULL, -- regular, irregular, gig
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Budget allocations
CREATE TABLE IF NOT EXISTS budget_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    allocated_amount DECIMAL(15, 2) NOT NULL CHECK (allocated_amount >= 0),
    spent_amount DECIMAL(15, 2) DEFAULT 0.00,
    budget_period VARCHAR(20) DEFAULT 'monthly', -- monthly, weekly, yearly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, category, start_date, end_date)
);

-- Indexes for Analytics
CREATE INDEX IF NOT EXISTS idx_transactions_mcc ON transactions(mcc);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_hour ON transactions(transaction_hour);
CREATE INDEX IF NOT EXISTS idx_transactions_day ON transactions(transaction_day_of_week);

CREATE INDEX IF NOT EXISTS idx_spending_buckets_user ON spending_buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_buckets_period ON spending_buckets(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_financial_dna_user ON financial_dna(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_dna_period ON financial_dna(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_top_merchants_user ON top_merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_top_merchants_period ON top_merchants(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_ai_coaching_user ON ai_coaching_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coaching_created ON ai_coaching_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_active ON financial_goals(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_income_user ON income_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_budget_user ON budget_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_active ON budget_allocations(user_id, is_active);

-- Update trigger to automatically set transaction metadata
CREATE OR REPLACE FUNCTION update_transaction_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Set transaction hour and day of week
    NEW.transaction_hour = EXTRACT(HOUR FROM NEW.created_at);
    NEW.transaction_day_of_week = EXTRACT(DOW FROM NEW.created_at);
    
    -- Simple impulse purchase detection (transactions under ₹500)
    NEW.is_impulse_purchase = (NEW.amount < 500);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_transaction_metadata ON transactions;
CREATE TRIGGER trigger_transaction_metadata
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_transaction_metadata();

-- Function to calculate spending buckets
CREATE OR REPLACE FUNCTION calculate_spending_buckets(p_user_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE(
    category VARCHAR(50),
    total_amount DECIMAL(15,2),
    transaction_count INTEGER,
    percentage_of_total DECIMAL(5,2),
    average_transaction DECIMAL(15,2)
) AS $$
DECLARE
    total_spending DECIMAL(15,2);
BEGIN
    -- Get total spending for the period
    SELECT COALESCE(SUM(amount), 0) INTO total_spending
    FROM transactions 
    WHERE user_id = p_user_id 
    AND created_at::date BETWEEN p_start_date AND p_end_date
    AND status = 'success';
    
    -- Return spending buckets
    RETURN QUERY
    SELECT 
        t.category::VARCHAR(50),
        COALESCE(SUM(t.amount), 0)::DECIMAL(15,2) as total_amount,
        COUNT(*)::INTEGER as transaction_count,
        CASE 
            WHEN total_spending > 0 THEN (COALESCE(SUM(t.amount), 0) * 100 / total_spending)::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
        END as percentage_of_total,
        CASE 
            WHEN COUNT(*) > 0 THEN (COALESCE(SUM(t.amount), 0) / COUNT(*))::DECIMAL(15,2)
            ELSE 0::DECIMAL(15,2)
        END as average_transaction
    FROM transactions t
    WHERE t.user_id = p_user_id 
    AND t.created_at::date BETWEEN p_start_date AND p_end_date
    AND t.status = 'success'
    AND t.category IS NOT NULL
    GROUP BY t.category
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. Row-Level Security (RLS) & Audit
-- ==========================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own data
DROP POLICY IF EXISTS user_isolation_policy ON users;
CREATE POLICY user_isolation_policy ON users
  FOR ALL
  USING (id = current_setting('app.current_user_id', true)::uuid);

-- Create policy for transactions - users can only see their own transactions
DROP POLICY IF EXISTS transaction_user_policy ON transactions;
CREATE POLICY transaction_user_policy ON transactions
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Create policy for inserting transactions
DROP POLICY IF EXISTS transaction_insert_policy ON transactions;
CREATE POLICY transaction_insert_policy ON transactions
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- Create policy for updating transactions (only own transactions)
DROP POLICY IF EXISTS transaction_update_policy ON transactions;
CREATE POLICY transaction_update_policy ON transactions
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- Admin role that can bypass RLS (for system operations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'finwise_admin') THEN
    CREATE ROLE finwise_admin;
    ALTER ROLE finwise_admin BYPASSRLS;
  END IF;
END
$$;

-- Application role with RLS enforcement
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'finwise_app') THEN
    CREATE ROLE finwise_app;
    ALTER ROLE finwise_app SET app.current_user_id = '';
  END IF;
END
$$;

-- Grant necessary permissions to application role
GRANT SELECT, INSERT, UPDATE ON users TO finwise_app;
GRANT SELECT, INSERT, UPDATE ON transactions TO finwise_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO finwise_app;

-- Function to set current user context (called at session start)
CREATE OR REPLACE FUNCTION set_current_user(user_uuid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_uuid::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger to log all data changes
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Determine user_id based on table
    IF TG_TABLE_NAME = 'users' THEN
        IF TG_OP = 'DELETE' THEN
            v_user_id := OLD.id;
        ELSE
            v_user_id := NEW.id;
        END IF;
    ELSE
        -- For other tables, assume user_id column exists
        IF TG_OP = 'DELETE' THEN
            v_user_id := OLD.user_id;
        ELSE
            v_user_id := NEW.user_id;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log(table_name, operation, user_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, v_user_id, row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log(table_name, operation, user_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, v_user_id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log(table_name, operation, user_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, v_user_id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach audit triggers to tables
DROP TRIGGER IF EXISTS users_audit_trigger ON users;
CREATE TRIGGER users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS transactions_audit_trigger ON transactions;
CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Additional security constraints

-- Prevent balance from going negative (additional check)
-- Note: Constraints might already exist, so we use DO block or just try adding them (Postgres doesn't have IF NOT EXISTS for constraints easily in one line)
-- We'll skip explicit constraint addition here as they are defined in CREATE TABLE or ALTER TABLE above.

-- Add index for RLS performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

COMMENT ON TABLE audit_log IS 'Audit trail for all data modifications';
COMMENT ON POLICY user_isolation_policy ON users IS 'Users can only access their own data';
COMMENT ON POLICY transaction_user_policy ON transactions IS 'Users can only see their own transactions';
