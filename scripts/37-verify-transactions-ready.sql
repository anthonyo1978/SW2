-- Verify that all required tables and columns exist for transactions system

-- Check transactions table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')
        THEN 'transactions table exists ✓'
        ELSE 'transactions table MISSING ✗'
    END as transactions_table_status;

-- Check service_agreements has required balance columns
SELECT 
    'service_agreements balance columns:' as info,
    column_name,
    data_type,
    CASE WHEN column_name IN ('allocated_amount', 'spent_amount', 'remaining_balance') 
         THEN '✓' ELSE '?' END as required
FROM information_schema.columns 
WHERE table_name = 'service_agreements' 
AND column_name IN ('allocated_amount', 'spent_amount', 'remaining_balance', 'total_value')
ORDER BY column_name;

-- Check foreign key relationships
SELECT 
    'Foreign key constraints:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'transactions';

-- Test a sample service agreement record
SELECT 
    'Sample service agreement with balance columns:' as info,
    id,
    total_value,
    allocated_amount,
    spent_amount,
    remaining_balance
FROM service_agreements 
LIMIT 1;

SELECT 'System verification complete!' as result;
