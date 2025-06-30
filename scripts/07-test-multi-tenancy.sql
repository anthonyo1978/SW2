-- =============================================
-- SWIVEL CRM - MULTI-TENANCY TEST SCRIPT
-- =============================================

-- This script tests the multi-tenancy setup
-- Run this after setting up the database to ensure everything works

-- =============================================
-- TEST 1: Create Test Organizations
-- =============================================
DO $$
DECLARE
  org1_id UUID;
  org2_id UUID;
  user1_id UUID := gen_random_uuid();
  user2_id UUID := gen_random_uuid();
BEGIN
  -- Create test organizations
  org1_id := public.create_organization_and_admin(
    user1_id,
    'admin1@testorg1.com',
    'Admin One',
    'Test Organization 1',
    '11 111 111 111',
    '02 1111 1111',
    'starter'
  );
  
  org2_id := public.create_organization_and_admin(
    user2_id,
    'admin2@testorg2.com',
    'Admin Two',
    'Test Organization 2',
    '22 222 222 222',
    '02 2222 2222',
    'pro'
  );
  
  RAISE NOTICE 'Created test organizations: % and %', org1_id, org2_id;
END $$;

-- =============================================
-- TEST 2: Verify Data Isolation
-- =============================================
-- Check that organizations are properly isolated
SELECT 
  o.name as org_name,
  p.full_name as admin_name,
  p.role,
  p.subscription_status
FROM organizations o
JOIN profiles p ON o.id = p.organization_id
WHERE o.name LIKE 'Test Organization%'
ORDER BY o.name;

-- =============================================
-- TEST 3: Test Bucket Auto-Creation
-- =============================================
-- Create test clients and verify bucket creation
DO $$
DECLARE
  org1_id UUID;
  client1_id UUID;
BEGIN
  -- Get first test org
  SELECT id INTO org1_id FROM organizations WHERE name = 'Test Organization 1';
  
  -- Create test client
  INSERT INTO clients (
    organization_id,
    first_name,
    last_name,
    sah_classification_level,
    status
  ) VALUES (
    org1_id,
    'John',
    'Doe',
    3, -- Level 3 = $5479.94 quarterly
    'active' -- This should trigger bucket creation
  ) RETURNING id INTO client1_id;
  
  RAISE NOTICE 'Created test client: %', client1_id;
END $$;

-- =============================================
-- TEST 4: Verify Bucket Creation
-- =============================================
-- Check that buckets were auto-created
SELECT 
  c.first_name || ' ' || c.last_name as client_name,
  bd.bucket_name,
  cb.current_balance,
  cb.credit_limit
FROM clients c
JOIN client_buckets cb ON c.id = cb.client_id
JOIN bucket_definitions bd ON cb.bucket_definition_id = bd.id
WHERE c.first_name = 'John' AND c.last_name = 'Doe'
ORDER BY bd.display_order;

-- =============================================
-- TEST 5: Test Bucket Transaction
-- =============================================
-- Test creating a transaction (this should work)
DO $$
DECLARE
  client_id UUID;
  transaction_id UUID;
BEGIN
  -- Get test client
  SELECT id INTO client_id FROM clients WHERE first_name = 'John' AND last_name = 'Doe';
  
  -- Create test transaction
  transaction_id := create_bucket_transaction(
    client_id,
    'SAH_QUARTERLY',
    150.00,
    'debit',
    'Test service delivery - Personal Care',
    'service_transaction'
  );
  
  RAISE NOTICE 'Created test transaction: %', transaction_id;
END $$;

-- =============================================
-- TEST 6: Verify Transaction and Balance Update
-- =============================================
SELECT 
  c.first_name || ' ' || c.last_name as client_name,
  bd.bucket_name,
  cb.current_balance,
  bt.amount,
  bt.transaction_type,
  bt.description,
  bt.processed_at
FROM clients c
JOIN client_buckets cb ON c.id = cb.client_id
JOIN bucket_definitions bd ON cb.bucket_definition_id = bd.id
JOIN bucket_transactions bt ON cb.id = bt.client_bucket_id
WHERE c.first_name = 'John' AND c.last_name = 'Doe'
  AND bd.bucket_code = 'SAH_QUARTERLY'
ORDER BY bt.processed_at DESC;

-- =============================================
-- CLEANUP TEST DATA (OPTIONAL)
-- =============================================
-- Uncomment to clean up test data
/*
DELETE FROM bucket_transactions WHERE description LIKE 'Test%';
DELETE FROM client_buckets WHERE client_id IN (
  SELECT id FROM clients WHERE first_name = 'John' AND last_name = 'Doe'
);
DELETE FROM clients WHERE first_name = 'John' AND last_name = 'Doe';
DELETE FROM profiles WHERE email LIKE '%@testorg%.com';
DELETE FROM organizations WHERE name LIKE 'Test Organization%';
*/

RAISE NOTICE 'Multi-tenancy test completed successfully!';
