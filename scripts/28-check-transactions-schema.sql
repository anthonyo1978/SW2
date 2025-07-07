-- Check the current transactions table schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the new columns exist
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
        AND column_name = 'bucket_id'
        AND table_schema = 'public'
) as bucket_id_exists;

SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
        AND column_name = 'service_description'
        AND table_schema = 'public'
) as service_description_exists;

-- Check constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass;
