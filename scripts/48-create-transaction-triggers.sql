-- Create transaction triggers for automatic balance management
-- This script sets up automatic balance updates when transactions are created, updated, or deleted

-- First, create a function to update bucket balances
CREATE OR REPLACE FUNCTION update_bucket_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new transaction)
    IF TG_OP = 'INSERT' THEN
        -- Update the bucket balance based on transaction type
        IF NEW.transaction_type = 'service_delivery' THEN
            -- Service delivery reduces the bucket balance (draw down)
            UPDATE agreement_buckets 
            SET current_balance = current_balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bucket_id;
        ELSIF NEW.transaction_type = 'invoice_item' THEN
            -- Invoice item increases the bucket balance (fill up)
            UPDATE agreement_buckets 
            SET current_balance = current_balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bucket_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (modified transaction)
    IF TG_OP = 'UPDATE' THEN
        -- First, reverse the old transaction
        IF OLD.transaction_type = 'service_delivery' THEN
            UPDATE agreement_buckets 
            SET current_balance = current_balance + OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bucket_id;
        ELSIF OLD.transaction_type = 'invoice_item' THEN
            UPDATE agreement_buckets 
            SET current_balance = current_balance - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bucket_id;
        END IF;
        
        -- Then apply the new transaction
        IF NEW.transaction_type = 'service_delivery' THEN
            UPDATE agreement_buckets 
            SET current_balance = current_balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bucket_id;
        ELSIF NEW.transaction_type = 'invoice_item' THEN
            UPDATE agreement_buckets 
            SET current_balance = current_balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bucket_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (removed transaction)
    IF TG_OP = 'DELETE' THEN
        -- Reverse the transaction
        IF OLD.transaction_type = 'service_delivery' THEN
            UPDATE agreement_buckets 
            SET current_balance = current_balance + OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bucket_id;
        ELSIF OLD.transaction_type = 'invoice_item' THEN
            UPDATE agreement_buckets 
            SET current_balance = current_balance - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bucket_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS transaction_balance_trigger ON transactions;
CREATE TRIGGER transaction_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bucket_balance();

-- Create a function to update service agreement remaining balance
CREATE OR REPLACE FUNCTION update_service_agreement_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the service agreement's remaining balance
    -- This is calculated as the sum of all draw-down bucket balances
    UPDATE service_agreements 
    SET remaining_balance = (
        SELECT COALESCE(SUM(current_balance), 0)
        FROM agreement_buckets 
        WHERE service_agreement_id = COALESCE(NEW.service_agreement_id, OLD.service_agreement_id)
        AND template_category = 'draw_down'
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.service_agreement_id, OLD.service_agreement_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for service agreement balance updates
DROP TRIGGER IF EXISTS agreement_balance_trigger ON agreement_buckets;
CREATE TRIGGER agreement_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON agreement_buckets
    FOR EACH ROW
    EXECUTE FUNCTION update_service_agreement_balance();

-- Create a function to generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    org_id UUID;
BEGIN
    -- Get the organization ID from the client
    SELECT c.organization_id INTO org_id
    FROM clients c
    WHERE c.id = NEW.client_id;
    
    -- Get the next transaction number for this organization
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 'TXN-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM transactions t
    JOIN clients c ON c.id = t.client_id
    WHERE c.organization_id = org_id;
    
    -- Set the transaction number
    NEW.transaction_number = 'TXN-' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction number generation
DROP TRIGGER IF EXISTS transaction_number_trigger ON transactions;
CREATE TRIGGER transaction_number_trigger
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION generate_transaction_number();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bucket_id ON transactions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_service_agreement_id ON transactions(service_agreement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- Create index for transaction number lookups
CREATE INDEX IF NOT EXISTS idx_transactions_number ON transactions(transaction_number);

-- Update existing service agreement balances
UPDATE service_agreements 
SET remaining_balance = (
    SELECT COALESCE(SUM(current_balance), 0)
    FROM agreement_buckets 
    WHERE service_agreement_id = service_agreements.id
    AND template_category = 'draw_down'
);

-- Add a constraint to prevent negative balances for draw-down buckets
-- (This is a soft constraint - the application should handle this, but this provides a safety net)
CREATE OR REPLACE FUNCTION check_bucket_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check draw-down buckets
    IF NEW.template_category = 'draw_down' AND NEW.current_balance < 0 THEN
        RAISE EXCEPTION 'Draw-down bucket balance cannot be negative. Current balance would be: %', NEW.current_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance validation
DROP TRIGGER IF EXISTS bucket_balance_check_trigger ON agreement_buckets;
CREATE TRIGGER bucket_balance_check_trigger
    BEFORE UPDATE ON agreement_buckets
    FOR EACH ROW
    EXECUTE FUNCTION check_bucket_balance();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_bucket_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION update_service_agreement_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_transaction_number() TO authenticated;
GRANT EXECUTE ON FUNCTION check_bucket_balance() TO authenticated;
