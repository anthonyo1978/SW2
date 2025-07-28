-- Create helper functions needed for RLS policies
-- This should be run before the contracts system migration

BEGIN;

-- Function to get the current user's organization ID
-- This is used in RLS policies to ensure users only see data from their organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Get the organization_id for the current authenticated user
    SELECT organization_id INTO org_id
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_user_organization_id() IS 'Returns the organization_id for the current authenticated user, used in RLS policies';

COMMIT;

-- Test the function
SELECT get_user_organization_id() as current_user_org_id;