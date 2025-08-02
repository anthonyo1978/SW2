-- Create the service status transition function
-- Run this in your Supabase SQL editor after the previous script

BEGIN;

-- First, let's create a helper function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to transition service status
CREATE OR REPLACE FUNCTION transition_service_status(
    service_id UUID,
    new_status VARCHAR(20)
)
RETURNS JSON AS $$
DECLARE
    current_service RECORD;
    user_org_id UUID;
BEGIN
    -- Get user's organization ID
    user_org_id := get_user_organization_id();
    
    IF user_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User organization not found'
        );
    END IF;
    
    -- Get current service details
    SELECT * INTO current_service 
    FROM services 
    WHERE id = service_id AND organization_id = user_org_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Service not found or access denied'
        );
    END IF;
    
    -- Validate status transitions
    CASE 
        WHEN current_service.status = 'draft' AND new_status IN ('active', 'inactive') THEN
            -- Valid transitions from draft
        WHEN current_service.status = 'active' AND new_status IN ('inactive', 'archived') THEN
            -- Valid transitions from active
        WHEN current_service.status = 'inactive' AND new_status IN ('active', 'archived') THEN
            -- Valid transitions from inactive
        WHEN current_service.status = 'archived' THEN
            -- Archived services cannot be transitioned (business rule)
            RETURN json_build_object(
                'success', false,
                'error', 'Archived services cannot be reactivated'
            );
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid status transition from ' || current_service.status || ' to ' || new_status
            );
    END CASE;
    
    -- Perform the status update
    UPDATE services 
    SET 
        status = new_status,
        updated_at = NOW(),
        -- Keep is_active in sync for backward compatibility
        is_active = (new_status = 'active')
    WHERE id = service_id;
    
    RETURN json_build_object(
        'success', true,
        'previous_status', current_service.status,
        'new_status', new_status,
        'message', 'Service status updated successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if service can be used in agreements
CREATE OR REPLACE FUNCTION can_service_be_used_in_agreements(service_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM services 
        WHERE id = service_id 
        AND status = 'active' 
        AND organization_id = get_user_organization_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for active services only (useful for agreements later)
CREATE OR REPLACE VIEW active_services AS
SELECT * FROM services 
WHERE status = 'active';

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION transition_service_status(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION can_service_be_used_in_agreements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;

COMMIT;

-- Test the function
SELECT 'Service status transition function created successfully' as status;

-- Show available functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%service%' 
AND routine_schema = 'public';