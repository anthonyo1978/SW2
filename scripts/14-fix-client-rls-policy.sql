-- =============================================
-- FIX CLIENT RLS POLICY
-- The issue: RLS policy is blocking client creation
-- =============================================

-- First, let's check what's happening with our RLS policy
-- The current policy might be too restrictive

-- Drop the existing client policy
DROP POLICY IF EXISTS "clients_org_isolation" ON clients;
DROP POLICY IF EXISTS "clients_org_policy" ON clients;

-- Create a more permissive policy that allows INSERT
CREATE POLICY "clients_full_access" ON clients
FOR ALL 
TO authenticated
USING (organization_id = public.get_user_org_simple())
WITH CHECK (organization_id = public.get_user_org_simple());

-- Also ensure our helper function is working
-- Test the function
DO $$
DECLARE
  test_org_id UUID;
BEGIN
  -- This should return the current user's org ID
  SELECT public.get_user_org_simple() INTO test_org_id;
  RAISE NOTICE 'Current user org ID: %', test_org_id;
  
  IF test_org_id IS NULL THEN
    RAISE NOTICE 'WARNING: get_user_org_simple() returned NULL - this will cause RLS issues';
  ELSE
    RAISE NOTICE 'SUCCESS: get_user_org_simple() is working correctly';
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON clients TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_simple() TO authenticated;
