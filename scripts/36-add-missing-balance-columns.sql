-- Add all missing balance tracking columns to service_agreements table
ALTER TABLE service_agreements 
ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS spent_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(12,2);

-- Initialize allocated_amount from total_value for existing records
UPDATE service_agreements 
SET allocated_amount = COALESCE(total_value, 0)
WHERE allocated_amount = 0 OR allocated_amount IS NULL;

-- Update remaining_balance to be calculated from allocated_amount - spent_amount
UPDATE service_agreements 
SET remaining_balance = COALESCE(allocated_amount, 0) - COALESCE(spent_amount, 0)
WHERE remaining_balance IS NULL;

-- Add constraint to ensure remaining_balance is not negative (drop first if exists)
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    BEGIN
        ALTER TABLE service_agreements DROP CONSTRAINT check_remaining_balance_non_negative;
    EXCEPTION
        WHEN undefined_object THEN
            -- Constraint doesn't exist, that's fine
            NULL;
    END;
    
    -- Add the constraint
    ALTER TABLE service_agreements 
    ADD CONSTRAINT check_remaining_balance_non_negative 
    CHECK (remaining_balance >= 0);
END $$;

-- Create function to recalculate balances from existing transactions (if any)
CREATE OR REPLACE FUNCTION recalculate_agreement_balances()
RETURNS TEXT AS $$
DECLARE
    agreement_record RECORD;
    total_spent DECIMAL(12,2);
BEGIN
    -- Loop through all service agreements
    FOR agreement_record IN 
        SELECT id, allocated_amount, total_value 
        FROM service_agreements 
    LOOP
        -- Calculate total spent from transactions (if transactions table exists)
        BEGIN
            SELECT COALESCE(SUM(
                CASE 
                    WHEN transaction_type IN ('drawdown', 'service_delivery', 'invoice_item') THEN amount
                    WHEN transaction_type IN ('refund', 'adjustment') THEN -amount
                    ELSE 0
                END
            ), 0) INTO total_spent
            FROM transactions 
            WHERE agreement_id = agreement_record.id 
            AND status IN ('completed', 'paid');
            
            -- Update the agreement with calculated values
            UPDATE service_agreements 
            SET 
                spent_amount = total_spent,
                remaining_balance = COALESCE(allocated_amount, total_value, 0) - total_spent,
                updated_at = NOW()
            WHERE id = agreement_record.id;
        EXCEPTION
            WHEN undefined_table THEN
                -- If transactions table doesn't exist yet, just initialize balances
                UPDATE service_agreements 
                SET 
                    spent_amount = 0,
                    remaining_balance = COALESCE(allocated_amount, total_value, 0),
                    updated_at = NOW()
                WHERE id = agreement_record.id;
        END;
    END LOOP;
    
    RETURN 'Balance recalculation completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation
SELECT recalculate_agreement_balances() as result;

-- Verify the columns were added correctly
SELECT 
    'Updated service_agreements structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'service_agreements' 
AND column_name IN ('spent_amount', 'remaining_balance', 'allocated_amount', 'total_value')
ORDER BY ordinal_position;

SELECT 'Balance columns added successfully!' as result;
