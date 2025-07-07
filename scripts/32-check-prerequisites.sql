-- Check if all prerequisite tables exist for transactions
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check organizations table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'organizations');
    END IF;
    
    -- Check clients table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'clients');
    END IF;
    
    -- Check service_agreements table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_agreements' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'service_agreements');
    END IF;
    
    -- Check agreement_buckets table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agreement_buckets' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'agreement_buckets');
    END IF;
    
    -- Check profiles table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'profiles');
    END IF;
    
    -- Report results
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'Missing required tables: %', array_to_string(missing_tables, ', ');
        RAISE EXCEPTION 'Cannot create transactions table - missing prerequisite tables';
    ELSE
        RAISE NOTICE 'All prerequisite tables exist. Ready to create transactions table.';
    END IF;
END $$;
