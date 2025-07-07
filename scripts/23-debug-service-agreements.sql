-- Debug script to check service agreement statuses and client relationships

-- Check what service agreement statuses exist
SELECT DISTINCT status, COUNT(*) as count
FROM service_agreements 
GROUP BY status
ORDER BY status;

-- Check clients and their service agreements
SELECT 
  c.id as client_id,
  c.first_name,
  c.last_name,
  c.status as client_status,
  sa.id as agreement_id,
  sa.agreement_number,
  sa.status as agreement_status,
  sa.start_date,
  sa.end_date,
  sa.created_at
FROM clients c
LEFT JOIN service_agreements sa ON c.id = sa.client_id
WHERE c.status = 'active'
ORDER BY c.first_name, sa.created_at DESC;

-- Check if we have any agreements with status 'current'
SELECT COUNT(*) as current_agreements_count
FROM service_agreements 
WHERE status = 'current';

-- Check if we have any agreements with status 'active'
SELECT COUNT(*) as active_agreements_count
FROM service_agreements 
WHERE status = 'active';

-- Check if we have any agreements with status 'draft'
SELECT COUNT(*) as draft_agreements_count
FROM service_agreements 
WHERE status = 'draft';

-- Check all possible agreement statuses with details
SELECT 
  status, 
  COUNT(*) as count,
  MIN(created_at) as earliest_created,
  MAX(created_at) as latest_created
FROM service_agreements 
GROUP BY status
ORDER BY status;

-- Show sample service agreements with all columns
SELECT 
  id,
  agreement_number,
  status,
  start_date,
  end_date,
  client_id,
  organization_id,
  created_at
FROM service_agreements 
ORDER BY created_at DESC
LIMIT 10;
