-- =============================================
-- TEST TRANSACTIONS SETUP
-- =============================================

-- Check if transactions table exists and has correct structure
SELECT 
    'Transactions table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    'Transactions indexes:' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'transactions';

-- Check RLS policies
SELECT 
    'Transactions RLS policies:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'transactions';

-- Check triggers
SELECT 
    'Transactions triggers:' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'transactions';

-- Check foreign key constraints
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

SELECT 'All checks completed successfully!' as result;
