-- Ensure transactions table has proper structure and relationships
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_service_agreement_id_fkey,
DROP CONSTRAINT IF EXISTS transactions_agreement_id_fkey;

-- Standardize column name to agreement_id
DO $$
BEGIN
    -- Check if service_agreement_id exists and rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'transactions' AND column_name = 'service_agreement_id') THEN
        
        -- If agreement_id doesn't exist, rename service_agreement_id to agreement_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'transactions' AND column_name = 'agreement_id') THEN
            ALTER TABLE transactions RENAME COLUMN service_agreement_id TO agreement_id;
        ELSE
            -- If both exist, copy data and drop the old column
            UPDATE transactions SET agreement_id = service_agreement_id WHERE agreement_id IS NULL;
            ALTER TABLE transactions DROP COLUMN service_agreement_id;
        END IF;
    END IF;
    
    -- Ensure agreement_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'agreement_id') THEN
        ALTER TABLE transactions ADD COLUMN agreement_id UUID;
    END IF;
END $$;

-- Make agreement_id NOT NULL
UPDATE transactions SET agreement_id = gen_random_uuid() WHERE agreement_id IS NULL;
ALTER TABLE transactions ALTER COLUMN agreement_id SET NOT NULL;

-- Add proper foreign key constraint
ALTER TABLE transactions 
ADD CONSTRAINT transactions_agreement_id_fkey 
FOREIGN KEY (agreement_id) REFERENCES service_agreements(id) ON DELETE CASCADE;

-- Ensure proper transaction types
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN ('service_delivery', 'invoice_item', 'drawdown', 'refund', 'adjustment'));

-- Ensure proper status values
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'approved', 'completed', 'paid', 'failed', 'cancelled'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_agreement_id ON transactions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
