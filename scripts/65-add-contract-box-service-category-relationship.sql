-- Add service category relationship to contract boxes
-- This allows each box to be optionally associated with one service category
-- to restrict which services can be billed against that box

BEGIN;

-- Add the service_category_id column to contract_boxes table
ALTER TABLE contract_boxes 
ADD COLUMN service_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contract_boxes_service_category_id 
    ON contract_boxes(service_category_id);

-- Add comment for documentation
COMMENT ON COLUMN contract_boxes.service_category_id IS 
    'Optional link to service category - restricts which services can be billed against this box. NULL means any service can be used.';

-- Create a function to prevent deletion of service categories that have associated boxes
CREATE OR REPLACE FUNCTION prevent_service_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if any contract boxes are associated with this category
    IF EXISTS (
        SELECT 1 FROM contract_boxes 
        WHERE service_category_id = OLD.id
    ) THEN
        RAISE EXCEPTION 'Cannot delete service category: % boxes are still associated with this category. Please reassign or remove the boxes first.', 
            (SELECT COUNT(*) FROM contract_boxes WHERE service_category_id = OLD.id);
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of categories with associated boxes
DROP TRIGGER IF EXISTS prevent_service_category_deletion_trigger ON service_categories;
CREATE TRIGGER prevent_service_category_deletion_trigger
    BEFORE DELETE ON service_categories
    FOR EACH ROW
    EXECUTE FUNCTION prevent_service_category_deletion();

-- Create a helper function to get available services for a contract box
CREATE OR REPLACE FUNCTION get_available_services_for_box(box_id UUID)
RETURNS TABLE (
    service_id UUID,
    service_name VARCHAR,
    service_code VARCHAR,
    base_cost DECIMAL,
    category_name VARCHAR
) AS $$
BEGIN
    -- Get the box's organization and category restriction
    RETURN QUERY
    WITH box_info AS (
        SELECT 
            cb.service_category_id,
            c.organization_id
        FROM contract_boxes cb
        JOIN contracts c ON cb.contract_id = c.id
        WHERE cb.id = box_id
    )
    SELECT 
        s.id as service_id,
        s.name as service_name,
        s.service_code,
        s.base_cost,
        s.category as category_name
    FROM services s
    JOIN box_info bi ON s.organization_id = bi.organization_id
    WHERE 
        s.status = 'active'
        AND (
            -- If box has no category restriction, allow all services
            bi.service_category_id IS NULL
            OR 
            -- If box has category restriction, only allow services from that category
            s.category = (
                SELECT name FROM service_categories 
                WHERE id = bi.service_category_id
            )
        )
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_available_services_for_box(UUID) TO authenticated;

-- Create a helper function to validate service usage against box restrictions
CREATE OR REPLACE FUNCTION validate_service_for_box(
    box_id UUID, 
    service_id UUID
)
RETURNS JSON AS $$
DECLARE
    box_category_id UUID;
    service_category VARCHAR;
    box_org_id UUID;
    service_org_id UUID;
BEGIN
    -- Get box information
    SELECT 
        cb.service_category_id,
        c.organization_id
    INTO box_category_id, box_org_id
    FROM contract_boxes cb
    JOIN contracts c ON cb.contract_id = c.id
    WHERE cb.id = box_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Contract box not found'
        );
    END IF;
    
    -- Get service information
    SELECT category, organization_id
    INTO service_category, service_org_id
    FROM services
    WHERE id = service_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Service not found or inactive'
        );
    END IF;
    
    -- Check organization match
    IF box_org_id != service_org_id THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Service and contract box belong to different organizations'
        );
    END IF;
    
    -- If box has no category restriction, allow any service
    IF box_category_id IS NULL THEN
        RETURN json_build_object(
            'valid', true,
            'message', 'Service allowed - box has no category restriction'
        );
    END IF;
    
    -- Check if service category matches box restriction
    IF service_category = (
        SELECT name FROM service_categories WHERE id = box_category_id
    ) THEN
        RETURN json_build_object(
            'valid', true,
            'message', 'Service allowed - matches box category restriction'
        );
    ELSE
        RETURN json_build_object(
            'valid', false,
            'error', 'Service category does not match box restriction',
            'box_category', (SELECT name FROM service_categories WHERE id = box_category_id),
            'service_category', service_category
        );
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'valid', false,
        'error', 'Validation error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_service_for_box(UUID, UUID) TO authenticated;

COMMIT;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contract_boxes' 
    AND column_name = 'service_category_id';

-- Show a sample of contract boxes with their new category column
SELECT 
    cb.id,
    cb.name,
    cb.box_type,
    cb.service_category_id,
    sc.name as category_name
FROM contract_boxes cb
LEFT JOIN service_categories sc ON cb.service_category_id = sc.id
LIMIT 5;