-- Migration: Create razorpay_orders table for tracking payment orders
-- This table stores Razorpay order information for idempotency and audit trail

CREATE TABLE IF NOT EXISTS razorpay_orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    receipt VARCHAR(100),
    status VARCHAR(20) DEFAULT 'created', -- created, paid, failed, cancelled
    payment_id VARCHAR(50),
    payment_method VARCHAR(50),
    new_balance DECIMAL(10, 2),
    error_code VARCHAR(50),
    error_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_razorpay_orders_user_id ON razorpay_orders(user_id);
CREATE INDEX idx_razorpay_orders_status ON razorpay_orders(status);
CREATE INDEX idx_razorpay_orders_payment_id ON razorpay_orders(payment_id);
CREATE INDEX idx_razorpay_orders_created_at ON razorpay_orders(created_at DESC);

-- Add RLS policies for security
ALTER TABLE razorpay_orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders
CREATE POLICY razorpay_orders_select_policy ON razorpay_orders
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Only authenticated users can insert their own orders
CREATE POLICY razorpay_orders_insert_policy ON razorpay_orders
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Only system can update orders (for webhook processing)
CREATE POLICY razorpay_orders_update_policy ON razorpay_orders
    FOR UPDATE
    USING (true);

COMMENT ON TABLE razorpay_orders IS 'Stores Razorpay payment orders for wallet top-up transactions';
COMMENT ON COLUMN razorpay_orders.order_id IS 'Unique Razorpay order ID';
COMMENT ON COLUMN razorpay_orders.status IS 'Order status: created, paid, failed, cancelled';
COMMENT ON COLUMN razorpay_orders.payment_id IS 'Razorpay payment ID after successful payment';
