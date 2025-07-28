-- Add outstanding_invoice_amount field to contracts table
-- This will track unpaid invoice amounts at the contract level

BEGIN;

-- Add the new column to the contracts table
ALTER TABLE contracts 
ADD COLUMN outstanding_invoice_amount DECIMAL(12,2) DEFAULT 0;

-- Add a comment to document the field
COMMENT ON COLUMN contracts.outstanding_invoice_amount IS 'Total amount of outstanding/unpaid invoices for this contract';

-- Update existing contracts to have 0 outstanding invoice amount
UPDATE contracts 
SET outstanding_invoice_amount = 0 
WHERE outstanding_invoice_amount IS NULL;

COMMIT;

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name = 'outstanding_invoice_amount';