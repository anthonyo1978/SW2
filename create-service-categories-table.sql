-- Create service categories table for dynamic category management
-- Run this in your Supabase SQL editor

BEGIN;

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Category information
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI display
    
    -- Category hierarchy (optional parent category)
    parent_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
    
    -- Ordering and display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_categories_organization_id ON service_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_parent ON service_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON service_categories(is_active);

-- Create unique constraint on category name per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_categories_org_name 
    ON service_categories(organization_id, LOWER(name)) 
    WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_service_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_categories_updated_at_trigger ON service_categories;
CREATE TRIGGER service_categories_updated_at_trigger
    BEFORE UPDATE ON service_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_service_categories_updated_at();

-- Enable RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view categories from their organization" ON service_categories
    FOR SELECT USING (
        organization_id = get_user_organization_id()
    );

CREATE POLICY "Users can create categories in their organization" ON service_categories
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
    );

CREATE POLICY "Users can update categories in their organization" ON service_categories
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
    );

CREATE POLICY "Users can delete categories from their organization" ON service_categories
    FOR DELETE USING (
        organization_id = get_user_organization_id()
    );

-- Insert some default categories for existing organizations
INSERT INTO service_categories (organization_id, name, description, color, sort_order, created_at)
SELECT 
    o.id,
    category.name,
    category.description,
    category.color,
    category.sort_order,
    NOW()
FROM organizations o
CROSS JOIN (
    VALUES 
        ('Core Supports', 'Essential daily living support services', '#10B981', 1),
        ('Capacity Building', 'Skills development and training services', '#3B82F6', 2),
        ('Capital Supports', 'Equipment and home modification services', '#8B5CF6', 3),
        ('Transport', 'Transportation and mobility services', '#F59E0B', 4),
        ('Accommodation', 'Housing and accommodation support', '#EF4444', 5),
        ('Administrative', 'Administrative and coordination services', '#6B7280', 6),
        ('Assessment', 'Assessment and planning services', '#06B6D4', 7),
        ('Other', 'Miscellaneous services not covered elsewhere', '#84CC16', 8)
) AS category(name, description, color, sort_order)
ON CONFLICT DO NOTHING;

-- Function to create a new service category
CREATE OR REPLACE FUNCTION create_service_category(
    category_name VARCHAR(100),
    category_description TEXT DEFAULT NULL,
    category_color VARCHAR(7) DEFAULT '#3B82F6'
)
RETURNS JSON AS $$
DECLARE
    user_org_id UUID;
    new_category RECORD;
BEGIN
    -- Get user's organization ID
    user_org_id := get_user_organization_id();
    
    IF user_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User organization not found'
        );
    END IF;
    
    -- Check if category already exists
    IF EXISTS (
        SELECT 1 FROM service_categories 
        WHERE organization_id = user_org_id 
        AND LOWER(name) = LOWER(category_name)
        AND is_active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Category already exists'
        );
    END IF;
    
    -- Insert new category
    INSERT INTO service_categories (
        organization_id,
        name,
        description,
        color,
        created_by,
        updated_by
    ) VALUES (
        user_org_id,
        TRIM(category_name),
        category_description,
        category_color,
        auth.uid(),
        auth.uid()
    )
    RETURNING * INTO new_category;
    
    RETURN json_build_object(
        'success', true,
        'category', row_to_json(new_category),
        'message', 'Category created successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_service_category(VARCHAR, TEXT, VARCHAR) TO authenticated;

COMMIT;

-- Test and show results
SELECT 'Service categories table created successfully' as status;

-- Show categories for the first organization
SELECT 
    name,
    description,
    color,
    sort_order,
    is_active
FROM service_categories 
ORDER BY sort_order, name
LIMIT 10;