-- Add transaction ID system with format TXN:0000001A
-- This script adds a transaction_number column and auto-generates unique IDs

-- First, add the transaction_number column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'transaction_number'
    ) THEN
        ALTER TABLE transactions ADD COLUMN transaction_number VARCHAR(20) UNIQUE;
    END IF;
END $$;

-- Create a sequence for transaction numbers
CREATE SEQUENCE IF NOT EXISTS transaction_number_seq START 1;

-- Function to generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    formatted_num TEXT;
BEGIN
    next_num := nextval('transaction_number_seq');
    formatted_num := 'TXN:' || LPAD(next_num::TEXT, 7, '0') || 'A';
    RETURN formatted_num;
END;
$$ LANGUAGE plpgsql;

-- Update existing transactions that don't have transaction numbers
UPDATE transactions 
SET transaction_number = generate_transaction_number()
WHERE transaction_number IS NULL OR transaction_number = '';

-- Create trigger to auto-generate transaction numbers for new transactions
CREATE OR REPLACE FUNCTION assign_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
        NEW.transaction_number := generate_transaction_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_transaction_number ON transactions;

-- Create the trigger
CREATE TRIGGER trigger_assign_transaction_number
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION assign_transaction_number();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_number ON transactions(transaction_number);

SELECT 'Transaction ID system created successfully' as result;
