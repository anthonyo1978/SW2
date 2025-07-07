-- Add balance tracking fields to service_agreements table
ALTER TABLE service_agreements 
ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(12,2) DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_service_agreements_balances ON service_agreements(remaining_balance, spent_amount);

-- Function to calculate and update service agreement balances
CREATE OR REPLACE FUNCTION update_service_agreement_balance()
RETURNS TRIGGER AS $$
DECLARE
    agreement_record RECORD;
    total_spent DECIMAL(12,2);
    new_remaining DECIMAL(12,2);
BEGIN
    -- Get the agreement ID from the transaction
    SELECT INTO agreement_record 
        id, allocated_amount, total_value
    FROM service_agreements 
    WHERE id = COALESCE(NEW.agreement_id, OLD.agreement_id);
    
    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate total spent from all transactions for this agreement
    SELECT COALESCE(SUM(
        CASE 
            WHEN transaction_type = 'service_delivery' THEN amount
            WHEN transaction_type = 'drawdown' THEN amount
            WHEN transaction_type = 'invoice_item' THEN -amount  -- Invoice items add back to balance
            WHEN transaction_type = 'refund' THEN -amount        -- Refunds add back to balance
            ELSE 0
        END
    ), 0) INTO total_spent
    FROM transactions 
    WHERE agreement_id = agreement_record.id
    AND status IN ('completed', 'approved', 'paid');
    
    -- Use allocated_amount if set, otherwise use total_value
    new_remaining := COALESCE(agreement_record.allocated_amount, agreement_record.total_value, 0) - total_spent;
    
    -- Update the service agreement balances
    UPDATE service_agreements 
    SET 
        spent_amount = total_spent,
        remaining_balance = new_remaining,
        updated_at = NOW()
    WHERE id = agreement_record.id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for balance updates
DROP TRIGGER IF EXISTS update_agreement_balance_on_transaction_insert ON transactions;
CREATE TRIGGER update_agreement_balance_on_transaction_insert
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_service_agreement_balance();

DROP TRIGGER IF EXISTS update_agreement_balance_on_transaction_update ON transactions;
CREATE TRIGGER update_agreement_balance_on_transaction_update
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_service_agreement_balance();

DROP TRIGGER IF EXISTS update_agreement_balance_on_transaction_delete ON transactions;
CREATE TRIGGER update_agreement_balance_on_transaction_delete
    AFTER DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_service_agreement_balance();

-- Initialize balances for existing service agreements
UPDATE service_agreements 
SET 
    allocated_amount = total_value,
    spent_amount = 0,
    remaining_balance = total_value
WHERE allocated_amount IS NULL;

-- Recalculate balances for agreements that have transactions
DO $$
DECLARE
    agreement_id UUID;
BEGIN
    FOR agreement_id IN 
        SELECT DISTINCT sa.id 
        FROM service_agreements sa 
        INNER JOIN transactions t ON t.agreement_id = sa.id
    LOOP
        -- Trigger the balance calculation by updating a transaction
        UPDATE transactions 
        SET updated_at = NOW() 
        WHERE agreement_id = agreement_id 
        LIMIT 1;
    END LOOP;
END $$;
