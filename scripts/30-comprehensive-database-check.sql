-- =============================================
-- COMPREHENSIVE DATABASE STATE CHECK
-- =============================================

-- Check if core tables exist
SELECT 
    'organizations' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'organizations' AND table_schema = 'public'
    ) as exists
UNION ALL
SELECT 
    'profiles' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' AND table_schema = 'public'
    ) as exists
UNION ALL
SELECT 
    'clients' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'clients' AND table_schema = 'public'
    ) as exists
UNION ALL
SELECT 
    'service_agreements' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'service_agreements' AND table_schema = 'public'
    ) as exists
UNION ALL
SELECT 
    'agreement_buckets' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'agreement_buckets' AND table_schema = 'public'
    ) as exists
UNION ALL
SELECT 
    'bucket_templates' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'bucket_templates' AND table_schema = 'public'
    ) as exists
UNION ALL
SELECT 
    'transactions' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'transactions' AND table_schema = 'public'
    ) as exists;

-- Check if key functions exist
SELECT 
    'get_user_org_simple' as function_name,
    EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_user_org_simple' AND routine_schema = 'public'
    ) as exists
UNION ALL
SELECT 
    'update_updated_at_column' as function_name,
    EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'update_updated_at_column' AND routine_schema = 'public'
    ) as exists;

-- Show all existing tables in public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
