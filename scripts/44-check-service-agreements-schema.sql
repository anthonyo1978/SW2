-- Check the current schema of service_agreements table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'service_agreements' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_agreements'
) as table_exists;

-- Check current constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'service_agreements'
ORDER BY tc.constraint_type, tc.constraint_name;
