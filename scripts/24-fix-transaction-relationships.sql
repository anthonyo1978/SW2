-- Fix foreign key relationships for transactions table
-- Drop existing foreign key constraints if they exist
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_client_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_service_agreement_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_bucket_id_fkey;

-- Recreate foreign key constraints with proper names
ALTER TABLE transactions 
ADD CONSTRAINT transactions_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_service_agreement_id_fkey 
FOREIGN KEY (service_agreement_id) REFERENCES service_agreements(id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_bucket_id_fkey 
FOREIGN KEY (bucket_id) REFERENCES buckets(id) ON DELETE SET NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Test the relationships
SELECT 
  t.id,
  t.amount,
  c.first_name,
  c.last_name,
  sa.agreement_number
FROM transactions t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN service_agreements sa ON t.service_agreement_id = sa.id
LIMIT 5;
