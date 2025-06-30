-- =============================================
-- TEST THE TRIGGER MANUALLY
-- =============================================

-- Test that we can call the function directly
DO $$
DECLARE
  test_org_id UUID;
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Test the organization creation function directly
  test_org_id := public.create_organization_and_admin(
    test_user_id,
    'test@example.com',
    'Test User',
    'Test Organization',
    '12 345 678 901',
    '02 1234 5678',
    'starter'
  );
  
  RAISE NOTICE 'SUCCESS: Created test organization: %', test_org_id;
  
  -- Clean up
  DELETE FROM profiles WHERE id = test_user_id;
  DELETE FROM organizations WHERE id = test_org_id;
  
  RAISE NOTICE 'Test completed successfully - trigger should work!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in test: %', SQLERRM;
END $$;
