-- Add Service Status Transitions (Draft -> Active)
-- This adds proper state management to services

BEGIN;

-- Add status column to services table (if it doesn't exist)
-- We'll use 'status' instead of 'is_active' for better state management
DO $$
BEGIN
    -- Check if status column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'services' AND column_name = 'status') THEN
        ALTER TABLE services ADD COLUMN status VARCHAR(20) DEFAULT 'draft' 
            CHECK (status IN ('draft', 'active', 'inactive', 'archived'));
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
        
        -- Update existing services to be 'active' if they were previously active
        UPDATE services SET status = CASE 
            WHEN is_active = true THEN 'active'
            ELSE 'draft'
        END;
        
    END IF;
    
    -- Update RLS policies to handle new status field
    -- Drop old policy if it exists
    DROP POLICY IF EXISTS "Users can view services from their organization" ON services;
    
    -- Recreate policy to include status considerations
    CREATE POLICY "Users can view services from their organization" ON services
        FOR SELECT USING (
            organization_id = get_user_organization_id()
        );
        
    -- We don't need to change other policies as they should work with the new status field
END $$;

-- Create function to transition service status
CREATE OR REPLACE FUNCTION transition_service_status(
    service_id UUID,
    new_status VARCHAR(20)
)
RETURNS JSON AS $$
DECLARE
    current_service RECORD;
    result JSON;
BEGIN
    -- Get current service details
    SELECT * INTO current_service 
    FROM services 
    WHERE id = service_id AND organization_id = get_user_organization_id();
    
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
    
    -- Log the status change in pricing history (for audit trail)
    INSERT INTO service_pricing_history (
        service_id,
        cost,
        unit,
        currency,
        change_reason,
        created_by
    ) VALUES (
        service_id,
        current_service.base_cost,
        current_service.unit,
        current_service.cost_currency,
        'Status changed from ' || current_service.status || ' to ' || new_status,
        auth.uid()
    );
    
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

-- Update sample services to have proper status (some draft, some active)
UPDATE services 
SET status = CASE 
    WHEN service_code IN ('PC001', 'CA001') THEN 'active'  -- Make some services active
    ELSE 'draft'  -- Keep others as draft
END
WHERE organization_id IS NOT NULL;

-- Create view for active services only (useful for agreements)
CREATE OR REPLACE VIEW active_services AS
SELECT * FROM services 
WHERE status = 'active' 
AND organization_id = get_user_organization_id();

COMMIT;

-- Show status of services after update
SELECT 'Service status transitions added successfully' as status;

-- Show breakdown of services by status
SELECT 
    status,
    COUNT(*) as count,
    ROUND(AVG(base_cost), 2) as avg_cost
FROM services 
GROUP BY status 
ORDER BY status;