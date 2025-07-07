-- Add current_balance column to agreement_buckets table
ALTER TABLE agreement_buckets 
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0;

-- Initialize current_balance for existing buckets
-- For draw-down buckets, set current_balance to custom_amount (full amount available)
-- For fill-up buckets, set current_balance to 0 (nothing accumulated yet)
UPDATE agreement_buckets 
SET current_balance = CASE 
  WHEN bt.template_category = 'draw_down' THEN agreement_buckets.custom_amount
  WHEN bt.template_category = 'fill_up' THEN 0
  ELSE 0
END
FROM bucket_templates bt
WHERE agreement_buckets.template_id = bt.id
AND (agreement_buckets.current_balance IS NULL OR agreement_buckets.current_balance = 0);

-- Create or replace function to update bucket balances when transactions change
CREATE OR REPLACE FUNCTION update_bucket_balance()
RETURNS TRIGGER AS $$
DECLARE
  bucket_category TEXT;
BEGIN
  -- Get the bucket category
  SELECT bt.template_category INTO bucket_category
  FROM agreement_buckets ab
  JOIN bucket_templates bt ON ab.template_id = bt.id
  WHERE ab.id = COALESCE(NEW.bucket_id, OLD.bucket_id);

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'service_delivery' AND bucket_category = 'draw_down' THEN
      -- Service delivery reduces available balance in draw-down buckets
      UPDATE agreement_buckets 
      SET current_balance = GREATEST(0, current_balance - NEW.amount),
          updated_at = NOW()
      WHERE id = NEW.bucket_id;
    ELSIF NEW.transaction_type = 'invoice_item' AND bucket_category = 'fill_up' THEN
      -- Invoice items increase accumulated balance in fill-up buckets
      UPDATE agreement_buckets 
      SET current_balance = current_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.bucket_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- First reverse the old transaction
    IF OLD.transaction_type = 'service_delivery' AND bucket_category = 'draw_down' THEN
      UPDATE agreement_buckets 
      SET current_balance = current_balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.bucket_id;
    ELSIF OLD.transaction_type = 'invoice_item' AND bucket_category = 'fill_up' THEN
      UPDATE agreement_buckets 
      SET current_balance = GREATEST(0, current_balance - OLD.amount),
          updated_at = NOW()
      WHERE id = OLD.bucket_id;
    END IF;

    -- Then apply the new transaction
    IF NEW.transaction_type = 'service_delivery' AND bucket_category = 'draw_down' THEN
      UPDATE agreement_buckets 
      SET current_balance = GREATEST(0, current_balance - NEW.amount),
          updated_at = NOW()
      WHERE id = NEW.bucket_id;
    ELSIF NEW.transaction_type = 'invoice_item' AND bucket_category = 'fill_up' THEN
      UPDATE agreement_buckets 
      SET current_balance = current_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.bucket_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Reverse the transaction
    IF OLD.transaction_type = 'service_delivery' AND bucket_category = 'draw_down' THEN
      UPDATE agreement_buckets 
      SET current_balance = current_balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.bucket_id;
    ELSIF OLD.transaction_type = 'invoice_item' AND bucket_category = 'fill_up' THEN
      UPDATE agreement_buckets 
      SET current_balance = GREATEST(0, current_balance - OLD.amount),
          updated_at = NOW()
      WHERE id = OLD.bucket_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction balance updates
DROP TRIGGER IF EXISTS trigger_update_bucket_balance ON transactions;
CREATE TRIGGER trigger_update_bucket_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bucket_balance();

-- Recalculate all bucket balances based on existing transactions
UPDATE agreement_buckets 
SET current_balance = CASE 
  WHEN bt.template_category = 'draw_down' THEN 
    GREATEST(0, agreement_buckets.custom_amount - COALESCE(
      (SELECT SUM(t.amount) 
       FROM transactions t 
       WHERE t.bucket_id = agreement_buckets.id 
       AND t.transaction_type = 'service_delivery'), 0))
  WHEN bt.template_category = 'fill_up' THEN 
    COALESCE(
      (SELECT SUM(t.amount) 
       FROM transactions t 
       WHERE t.bucket_id = agreement_buckets.id 
       AND t.transaction_type = 'invoice_item'), 0)
  ELSE 0
END
FROM bucket_templates bt
WHERE agreement_buckets.template_id = bt.id;

-- Verify the setup by showing current bucket balances
SELECT 
  c.first_name || ' ' || c.last_name as client_name,
  sa.agreement_number,
  bt.template_name,
  bt.template_category,
  ab.custom_amount,
  ab.current_balance,
  CASE 
    WHEN bt.template_category = 'draw_down' THEN 'Available: $' || ab.current_balance::text
    WHEN bt.template_category = 'fill_up' THEN 'Accumulated: $' || ab.current_balance::text
    ELSE 'Balance: $' || ab.current_balance::text
  END as balance_display
FROM agreement_buckets ab
JOIN bucket_templates bt ON ab.template_id = bt.id
JOIN service_agreements sa ON ab.agreement_id = sa.id
JOIN clients c ON sa.client_id = c.id
ORDER BY c.first_name, sa.agreement_number, bt.template_name;
