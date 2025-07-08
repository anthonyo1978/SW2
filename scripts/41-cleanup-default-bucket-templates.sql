-- First, let's see what bucket templates currently exist
SELECT 
    id,
    name,
    description,
    category,
    funding_source,
    starting_amount,
    credit_limit,
    is_active,
    created_at,
    organization_id
FROM bucket_templates 
ORDER BY created_at;

-- Check if these are the default seeded templates by looking for specific names
SELECT 
    'Default templates found:' as status,
    COUNT(*) as count
FROM bucket_templates 
WHERE name IN (
    'NDIS Core Supports',
    'NDIS Capacity Building', 
    'Private Pay Services',
    'Government Subsidy',
    'NDIS Plan Management',
    'Emergency Support Fund',
    'Respite Care Credit'
);

-- Delete the default seeded templates that were created during setup
DELETE FROM bucket_templates 
WHERE name IN (
    'NDIS Core Supports',
    'NDIS Capacity Building', 
    'Private Pay Services',
    'Government Subsidy',
    'NDIS Plan Management',
    'Emergency Support Fund',
    'Respite Care Credit'
);

-- Verify cleanup - should show only user-created templates now
SELECT 
    'After cleanup:' as status,
    COUNT(*) as remaining_templates
FROM bucket_templates;

-- Show remaining templates
SELECT 
    id,
    name,
    description,
    category,
    funding_source,
    is_active,
    created_at
FROM bucket_templates 
ORDER BY created_at;
