-- =============================================
-- TEST THE FUNCTION DIRECTLY
-- This will tell us exactly what's failing
-- =============================================

-- Test the organization creation function
DO $$
DECLARE
  test_org_id UUID;
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing organization creation function...';
  
  -- Test the function directly
  test_org_id := public.create_organization_and_admin(
    test_user_id,
    'test@example.com',
    'Test User',
    'Test Organization',
    '12 345 678 901',
    '02 1234 5678',
    'starter'
  );
  
  RAISE NOTICE 'SUCCESS: Created organization: %', test_org_id;
  
  -- Verify the data was created
  IF EXISTS (SELECT 1 FROM organizations WHERE id = test_org_id) THEN
    RAISE NOTICE '✅ Organization record exists';
  ELSE
    RAISE NOTICE '❌ Organization record missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM profiles WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Profile record exists';
  ELSE
    RAISE NOTICE '❌ Profile record missing';
  END IF;
  
  -- Clean up test data
  DELETE FROM profiles WHERE id = test_user_id;
  DELETE FROM organizations WHERE id = test_org_id;
  
  RAISE NOTICE 'Test completed successfully - function works!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in test: %', SQLERRM;
    RAISE NOTICE 'This is the exact error causing signup to fail';
END $$;
