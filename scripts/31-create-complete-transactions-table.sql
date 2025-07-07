-- =============================================
-- CREATE COMPLETE TRANSACTIONS TABLE
-- =============================================

-- First ensure we have the required functions
CREATE OR REPLACE FUNCTION get_user_org_simple()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure we have the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create transactions table with all required fields
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES agreement_buckets(id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    
    -- Service delivery fields
    service_description TEXT,
    service_id TEXT,
    unit_cost DECIMAL(12,2),
    quantity INTEGER DEFAULT 1,
    
    -- Transaction type affects how service agreement balances are updated
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('drawdown', 'refund', 'adjustment', 'service_delivery', 'invoice_item', 'invoice')),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'approved', 'completed', 'paid', 'failed', 'cancelled')),
    
    -- Reference numbers
    reference_number TEXT,
    invoice_number TEXT,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view transactions in their organization" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their organization" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions in their organization" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions in their organization" ON transactions;
DROP POLICY IF EXISTS "Users can manage transactions for their organization" ON transactions;

-- Create comprehensive RLS policy
CREATE POLICY "Users can manage transactions for their organization" ON transactions
    FOR ALL USING (
        organization_id = get_user_org_simple()
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_agreement_id ON transactions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bucket_id ON transactions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update service agreement balances when transactions are created/updated/deleted
CREATE OR REPLACE FUNCTION update_agreement_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    agreement_record RECORD;
    old_amount DECIMAL(12,2) := 0;
    new_amount DECIMAL(12,2) := 0;
BEGIN
    -- Determine amounts based on operation
    IF TG_OP = 'DELETE' THEN
        old_amount := OLD.amount;
        agreement_record := (SELECT * FROM service_agreements WHERE id = OLD.agreement_id);
    ELSIF TG_OP = 'UPDATE' THEN
        old_amount := OLD.amount;
        new_amount := NEW.amount;
        agreement_record := (SELECT * FROM service_agreements WHERE id = NEW.agreement_id);
    ELSIF TG_OP = 'INSERT' THEN
        new_amount := NEW.amount;
        agreement_record := (SELECT * FROM service_agreements WHERE id = NEW.agreement_id);
    END IF;

    -- Update service agreement balances
    IF TG_OP = 'DELETE' THEN
        -- Reverse the transaction
        IF OLD.transaction_type IN ('drawdown', 'service_delivery') THEN
            -- Add back to remaining balance (was spent, now unspent)
            UPDATE service_agreements 
            SET 
                spent_amount = COALESCE(spent_amount, 0) - old_amount,
                remaining_balance = COALESCE(remaining_balance, 0) + old_amount,
                updated_at = NOW()
            WHERE id = OLD.agreement_id;
        ELSIF OLD.transaction_type IN ('refund', 'invoice', 'invoice_item') THEN
            -- Remove from remaining balance (was added, now removed)
            UPDATE service_agreements 
            SET 
                remaining_balance = COALESCE(remaining_balance, 0) - old_amount,
                updated_at = NOW()
            WHERE id = OLD.agreement_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle the difference
        DECLARE
            amount_diff DECIMAL(12,2) := new_amount - old_amount;
        BEGIN
            IF NEW.transaction_type IN ('drawdown', 'service_delivery') THEN
                UPDATE service_agreements 
                SET 
                    spent_amount = COALESCE(spent_amount, 0) + amount_diff,
                    remaining_balance = COALESCE(remaining_balance, 0) - amount_diff,
                    updated_at = NOW()
                WHERE id = NEW.agreement_id;
            ELSIF NEW.transaction_type IN ('refund', 'invoice', 'invoice_item') THEN
                UPDATE service_agreements 
                SET 
                    remaining_balance = COALESCE(remaining_balance, 0) + amount_diff,
                    updated_at = NOW()
                WHERE id = NEW.agreement_id;
            END IF;
        END;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        -- Apply the transaction
        IF NEW.transaction_type IN ('drawdown', 'service_delivery') THEN
            -- Reduce remaining balance, increase spent
            UPDATE service_agreements 
            SET 
                spent_amount = COALESCE(spent_amount, 0) + new_amount,
                remaining_balance = COALESCE(remaining_balance, 0) - new_amount,
                updated_at = NOW()
            WHERE id = NEW.agreement_id;
        ELSIF NEW.transaction_type IN ('refund', 'invoice', 'invoice_item') THEN
            -- Increase remaining balance
            UPDATE service_agreements 
            SET 
                remaining_balance = COALESCE(remaining_balance, 0) + new_amount,
                updated_at = NOW()
            WHERE id = NEW.agreement_id;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for agreement balance updates
DROP TRIGGER IF EXISTS update_agreement_balance_on_transaction_change ON transactions;
CREATE TRIGGER update_agreement_balance_on_transaction_change
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_agreement_balance_on_transaction();

-- Grant necessary permissions
GRANT ALL ON transactions TO authenticated;
GRANT USAGE ON SEQUENCE transactions_id_seq TO authenticated;
