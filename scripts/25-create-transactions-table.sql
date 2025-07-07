-- Create transactions table for tracking service delivery and financial transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  
  -- Transaction type affects how service agreement balances are updated
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('drawdown', 'refund', 'adjustment', 'service_delivery', 'invoice_item')),
  
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

CREATE POLICY "Users can view transactions in their organization" ON transactions
  FOR SELECT USING (organization_id = get_user_org_simple());

CREATE POLICY "Users can create transactions in their organization" ON transactions
  FOR INSERT WITH CHECK (organization_id = get_user_org_simple());

CREATE POLICY "Users can update transactions in their organization" ON transactions
  FOR UPDATE USING (organization_id = get_user_org_simple());

CREATE POLICY "Users can delete transactions in their organization" ON transactions
  FOR DELETE USING (organization_id = get_user_org_simple());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_agreement_id ON transactions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);

-- Add updated_at trigger
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
