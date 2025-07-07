-- Add balance tracking fields to service agreements
ALTER TABLE service_agreements 
ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS spent_amount DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED;

-- Add constraints to ensure data integrity
ALTER TABLE service_agreements 
ADD CONSTRAINT check_allocated_amount_positive CHECK (allocated_amount >= 0),
ADD CONSTRAINT check_spent_amount_positive CHECK (spent_amount >= 0);

-- Create function to update service agreement balances when transactions change
CREATE OR REPLACE FUNCTION update_service_agreement_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE service_agreements 
    SET spent_amount = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('drawdown', 'service_delivery', 'invoice_item') THEN amount
          WHEN transaction_type IN ('refund', 'adjustment') THEN -amount
          ELSE 0
        END
      ), 0)
      FROM transactions 
      WHERE agreement_id = NEW.agreement_id 
        AND status IN ('completed', 'paid')
    )
    WHERE id = NEW.agreement_id;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE service_agreements 
    SET spent_amount = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('drawdown', 'service_delivery', 'invoice_item') THEN amount
          WHEN transaction_type IN ('refund', 'adjustment') THEN -amount
          ELSE 0
        END
      ), 0)
      FROM transactions 
      WHERE agreement_id = OLD.agreement_id 
        AND status IN ('completed', 'paid')
    )
    WHERE id = OLD.agreement_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update service agreement balances
DROP TRIGGER IF EXISTS trigger_update_service_agreement_balance_insert ON transactions;
CREATE TRIGGER trigger_update_service_agreement_balance_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_service_agreement_balance();

DROP TRIGGER IF EXISTS trigger_update_service_agreement_balance_update ON transactions;
CREATE TRIGGER trigger_update_service_agreement_balance_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_service_agreement_balance();

DROP TRIGGER IF EXISTS trigger_update_service_agreement_balance_delete ON transactions;
CREATE TRIGGER trigger_update_service_agreement_balance_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_service_agreement_balance();

-- Update existing service agreements to calculate current balances
UPDATE service_agreements 
SET spent_amount = (
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type IN ('drawdown', 'service_delivery', 'invoice_item') THEN amount
      WHEN transaction_type IN ('refund', 'adjustment') THEN -amount
      ELSE 0
    END
  ), 0)
  FROM transactions 
  WHERE agreement_id = service_agreements.id 
    AND status IN ('completed', 'paid')
);
