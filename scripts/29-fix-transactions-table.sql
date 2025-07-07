-- First, let's add the new columns if they don't exist
DO $$ 
BEGIN
    -- Add bucket_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'bucket_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN bucket_id UUID;
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_bucket 
            FOREIGN KEY (bucket_id) REFERENCES agreement_buckets(id);
    END IF;

    -- Add service_description column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'service_description'
    ) THEN
        ALTER TABLE transactions ADD COLUMN service_description TEXT;
    END IF;

    -- Add service_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'service_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN service_id TEXT;
    END IF;

    -- Add unit_cost column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'unit_cost'
    ) THEN
        ALTER TABLE transactions ADD COLUMN unit_cost DECIMAL(12,2);
    END IF;

    -- Add quantity column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'quantity'
    ) THEN
        ALTER TABLE transactions ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;
END $$;

-- Create index for bucket_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_transactions_bucket_id ON transactions(bucket_id);

-- Update RLS policy for transactions to include bucket access
DROP POLICY IF EXISTS "Users can manage transactions for their organization" ON transactions;

CREATE POLICY "Users can manage transactions for their organization" ON transactions
    FOR ALL USING (
        organization_id IN (
            SELECT get_user_org_simple()
        )
    );
