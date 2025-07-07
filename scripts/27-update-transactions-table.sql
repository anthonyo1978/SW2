-- Add new fields to transactions table for service delivery tracking
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS bucket_id UUID REFERENCES agreement_buckets(id),
ADD COLUMN IF NOT EXISTS service_description TEXT,
ADD COLUMN IF NOT EXISTS service_id TEXT,
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) GENERATED ALWAYS AS (unit_cost * quantity) STORED;

-- Add index for bucket_id
CREATE INDEX IF NOT EXISTS idx_transactions_bucket_id ON transactions(bucket_id);

-- Update the check constraint to allow for calculated totals
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (amount > 0);

-- Add constraint to ensure total_amount matches amount for consistency
ALTER TABLE transactions ADD CONSTRAINT check_amount_total_consistency 
CHECK (total_amount IS NULL OR amount = total_amount);
