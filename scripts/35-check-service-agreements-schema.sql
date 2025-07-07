-- Check what columns currently exist in service_agreements table
SELECT 
    'Current service_agreements table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'service_agreements' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_agreements')
        THEN 'service_agreements table exists'
        ELSE 'service_agreements table does NOT exist'
    END as table_status;
