-- Debug script to check transaction loading issues
SELECT 'Checking database structure...' as step;

-- Check if transactions table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') 
        THEN 'transactions table EXISTS' 
        ELSE 'transactions table MISSING' 
    END as transactions_table_status;

-- Check transactions table structure
SELECT 'Transactions table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- Check clients table structure
SELECT 'Clients table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Check if Antonio Fiorelli exists
SELECT 'Checking for Antonio Fiorelli...' as step;
SELECT id, first_name, last_name, status, organization_id
FROM clients 
WHERE (first_name ILIKE '%antonio%' AND last_name ILIKE '%fiorelli%')
   OR (first_name ILIKE '%fiorelli%' AND last_name ILIKE '%antonio%');

-- Check all transactions
SELECT 'All transactions in database:' as step;
SELECT 
    id,
    transaction_number,
    client_id,
    agreement_id,
    description,
    service_description,
    amount,
    transaction_type,
    status,
    created_at,
    organization_id
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- Check service agreements
SELECT 'Service agreements:' as step;
SELECT 
    id,
    client_id,
    name,
    status,
    total_value,
    allocated_amount,
    spent_amount,
    remaining_balance,
    organization_id
FROM service_agreements
ORDER BY created_at DESC
LIMIT 5;

-- Try to join transactions with clients
SELECT 'Attempting transaction-client join...' as step;
SELECT 
    t.id as transaction_id,
    t.transaction_number,
    t.description,
    t.amount,
    c.first_name,
    c.last_name,
    c.id as client_id
FROM transactions t
LEFT JOIN clients c ON t.client_id = c.id
ORDER BY t.created_at DESC
LIMIT 5;
