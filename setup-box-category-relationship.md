# Setup Box-Category Relationship

## Overview
This guide sets up the relationship between contract boxes and service categories, allowing each box to be optionally restricted to services from a specific category.

## Database Changes Required

### Step 1: Add Column and Index
Run this SQL in your Supabase SQL Editor:

```sql
-- Add service category relationship column to contract_boxes
ALTER TABLE contract_boxes 
ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contract_boxes_service_category_id 
    ON contract_boxes(service_category_id);

-- Add comment for documentation
COMMENT ON COLUMN contract_boxes.service_category_id IS 
    'Optional link to service category - restricts which services can be billed against this box. NULL means any service can be used.';
```

### Step 2: Add Deletion Prevention
Run this SQL to prevent deletion of categories that have associated boxes:

```sql
-- Create function to prevent deletion of service categories with associated boxes
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

-- Create trigger
DROP TRIGGER IF EXISTS prevent_service_category_deletion_trigger ON service_categories;
CREATE TRIGGER prevent_service_category_deletion_trigger
    BEFORE DELETE ON service_categories
    FOR EACH ROW
    EXECUTE FUNCTION prevent_service_category_deletion();
```

### Step 3: Add Helper Functions (Optional but Recommended)
These functions will be useful for future billing/booking features:

```sql
-- Function to get available services for a contract box
CREATE OR REPLACE FUNCTION get_available_services_for_box(box_id UUID)
RETURNS TABLE (
    service_id UUID,
    service_name VARCHAR,
    service_code VARCHAR,
    base_cost DECIMAL,
    category_name VARCHAR
) AS $$
BEGIN
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_services_for_box(UUID) TO authenticated;

-- Function to validate service usage against box restrictions
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_service_for_box(UUID, UUID) TO authenticated;
```

## Verification

After running the SQL commands, verify the setup:

```sql
-- Check if column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contract_boxes' 
    AND column_name = 'service_category_id';

-- Check existing contract boxes
SELECT 
    cb.id,
    cb.name,
    cb.box_type,
    cb.service_category_id,
    sc.name as category_name
FROM contract_boxes cb
LEFT JOIN service_categories sc ON cb.service_category_id = sc.id
LIMIT 5;
```

## What This Enables

1. **Box Creation**: Users can now optionally associate a box with a service category during contract creation
2. **Service Restriction**: When a box has a category, only services from that category can be billed against it
3. **Flexible Boxes**: Boxes without a category can use any service (existing behavior maintained)
4. **Data Integrity**: Categories cannot be deleted if boxes are using them
5. **Future Features**: Helper functions are ready for billing/booking restrictions

## UI Changes Made

- Added service category dropdown to box creation form
- Shows colored category indicators
- Clear messaging about restriction vs. flexible behavior
- Existing boxes remain unassigned (flexible) until manually configured