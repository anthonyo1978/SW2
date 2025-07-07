-- Create transactions table for tracking service delivery and invoicing
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  bucket_id UUID NOT NULL REFERENCES agreement_buckets(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  
  -- Transaction type affects how buckets are updated
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('service_delivery', 'invoice_item')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'invoiced', 'paid')),
  
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

CREATE POLICY "Users can view transactions in their organization" ON transactions
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create transactions in their organization" ON transactions
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update transactions in their organization" ON transactions
  FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete transactions in their organization" ON transactions
  FOR DELETE USING (organization_id = get_user_organization_id());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_agreement_id ON transactions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bucket_id ON transactions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add updated_at trigger
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update bucket balances when transactions are created/updated
CREATE OR REPLACE FUNCTION update_bucket_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  bucket_category TEXT;
  current_balance DECIMAL(10,2);
BEGIN
  -- Get the bucket category to determine how to update balance
  SELECT template_category INTO bucket_category
  FROM agreement_buckets
  WHERE id = COALESCE(NEW.bucket_id, OLD.bucket_id);

  IF TG_OP = 'INSERT' THEN
    -- For draw_down buckets: service_delivery reduces available funds
    -- For fill_up buckets: invoice_item increases amount owed
    IF bucket_category = 'draw_down' AND NEW.transaction_type = 'service_delivery' THEN
      -- Reduce available funds in draw_down bucket
      UPDATE agreement_buckets 
      SET current_balance = COALESCE(current_balance, custom_amount) - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.bucket_id;
    ELSIF bucket_category = 'fill_up' AND NEW.transaction_type = 'invoice_item' THEN
      -- Increase amount owed in fill_up bucket
      UPDATE agreement_buckets 
      SET current_balance = COALESCE(current_balance, 0) + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.bucket_id;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle amount changes
    IF OLD.amount != NEW.amount OR OLD.bucket_id != NEW.bucket_id THEN
      -- Reverse old transaction
      IF bucket_category = 'draw_down' AND OLD.transaction_type = 'service_delivery' THEN
        UPDATE agreement_buckets 
        SET current_balance = COALESCE(current_balance, custom_amount) + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.bucket_id;
      ELSIF bucket_category = 'fill_up' AND OLD.transaction_type = 'invoice_item' THEN
        UPDATE agreement_buckets 
        SET current_balance = COALESCE(current_balance, 0) - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.bucket_id;
      END IF;
      
      -- Apply new transaction
      SELECT template_category INTO bucket_category
      FROM agreement_buckets
      WHERE id = NEW.bucket_id;
      
      IF bucket_category = 'draw_down' AND NEW.transaction_type = 'service_delivery' THEN
        UPDATE agreement_buckets 
        SET current_balance = COALESCE(current_balance, custom_amount) - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.bucket_id;
      ELSIF bucket_category = 'fill_up' AND NEW.transaction_type = 'invoice_item' THEN
        UPDATE agreement_buckets 
        SET current_balance = COALESCE(current_balance, 0) + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.bucket_id;
      END IF;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the transaction
    IF bucket_category = 'draw_down' AND OLD.transaction_type = 'service_delivery' THEN
      UPDATE agreement_buckets 
      SET current_balance = COALESCE(current_balance, custom_amount) + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.bucket_id;
    ELSIF bucket_category = 'fill_up' AND OLD.transaction_type = 'invoice_item' THEN
      UPDATE agreement_buckets 
      SET current_balance = COALESCE(current_balance, 0) - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.bucket_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bucket balance updates
CREATE TRIGGER update_bucket_balance_on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bucket_balance_on_transaction();

-- Add current_balance column to agreement_buckets if it doesn't exist
ALTER TABLE agreement_buckets 
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2);

-- Initialize current_balance for existing buckets
UPDATE agreement_buckets 
SET current_balance = CASE 
  WHEN template_category = 'draw_down' THEN custom_amount
  WHEN template_category = 'fill_up' THEN 0
  ELSE 0
END
WHERE current_balance IS NULL;
