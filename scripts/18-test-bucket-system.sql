-- =============================================
-- TEST THE BUCKET SYSTEM
-- Create some test data to verify everything works
-- =============================================

-- First, let's create a test client and make them active
DO $$
DECLARE
  test_client_id UUID;
  test_org_id UUID;
BEGIN
  -- Get the first organization (assuming you have one from signup)
  SELECT id INTO test_org_id FROM organizations LIMIT 1;
  
  IF test_org_id IS NULL THEN
    RAISE NOTICE 'No organization found - please sign up first';
    RETURN;
  END IF;
  
  -- Create a test client
  INSERT INTO clients (
    organization_id,
    first_name,
    last_name,
    sah_classification_level,
    funding_type,
    plan_budget,
    status
  ) VALUES (
    test_org_id,
    'Test',
    'Client',
    4, -- Level 4 = $28,763.16 annual budget
    'sah',
    28763.16,
    'active' -- This should trigger bucket creation
  ) RETURNING id INTO test_client_id;
  
  RAISE NOTICE 'Created test client: %', test_client_id;
  
  -- Wait a moment for trigger to complete
  PERFORM pg_sleep(1);
  
  -- Check if buckets were created
  IF EXISTS (SELECT 1 FROM client_buckets WHERE client_id = test_client_id) THEN
    RAISE NOTICE '✅ Buckets created successfully for test client';
    
    -- Show the buckets
    FOR rec IN 
      SELECT cb.current_balance, bd.bucket_name, bd.bucket_category
      FROM client_buckets cb
      JOIN bucket_definitions bd ON cb.bucket_definition_id = bd.id
      WHERE cb.client_id = test_client_id
    LOOP
      RAISE NOTICE 'Bucket: % (%) - Balance: $%', rec.bucket_name, rec.bucket_category, rec.current_balance;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ No buckets created - check trigger function';
  END IF;
  
END $$;

-- Test creating a transaction
DO $$
DECLARE
  test_client_id UUID;
  transaction_id UUID;
BEGIN
  -- Get our test client
  SELECT id INTO test_client_id 
  FROM clients 
  WHERE first_name = 'Test' AND last_name = 'Client' 
  LIMIT 1;
  
  IF test_client_id IS NULL THEN
    RAISE NOTICE 'Test client not found';
    RETURN;
  END IF;
  
  -- Create a test transaction
  BEGIN
    transaction_id := create_bucket_transaction(
      test_client_id,
      'SAH_QUARTERLY',
      250.00,
      'debit',
      'Test service delivery - Personal Care (2.5 hours)',
      'service_transaction'
    );
    
    RAISE NOTICE '✅ Test transaction created: %', transaction_id;
    
    -- Show updated balance
    FOR rec IN 
      SELECT cb.current_balance, bd.bucket_name
      FROM client_buckets cb
      JOIN bucket_definitions bd ON cb.bucket_definition_id = bd.id
      WHERE cb.client_id = test_client_id AND bd.bucket_code = 'SAH_QUARTERLY'
    LOOP
      RAISE NOTICE 'Updated balance for %: $%', rec.bucket_name, rec.current_balance;
    END LOOP;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Transaction failed: %', SQLERRM;
  END;
  
END $$;

-- Show summary
SELECT 
  'Bucket System Test Complete' as status,
  COUNT(DISTINCT c.id) as test_clients,
  COUNT(cb.id) as total_buckets,
  COUNT(bt.id) as total_transactions
FROM clients c
LEFT JOIN client_buckets cb ON c.id = cb.client_id
LEFT JOIN bucket_transactions bt ON cb.id = bt.client_bucket_id
WHERE c.first_name = 'Test' AND c.last_name = 'Client';
