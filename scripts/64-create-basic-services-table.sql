-- Create a basic services table (simplified version for testing)
-- Run this if the main services script failed

BEGIN;

-- Create basic services table
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Core service information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_code VARCHAR(50),
    
    -- Pricing information
    base_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost_currency VARCHAR(3) DEFAULT 'AUD',
    unit VARCHAR(20) NOT NULL DEFAULT 'hour',
    
    -- Service rules
    allow_discount BOOLEAN DEFAULT true,
    can_be_cancelled BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    is_taxable BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    
    -- Service categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Status and availability
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
    is_active BOOLEAN DEFAULT false,
    
    -- Pricing flexibility
    has_variable_pricing BOOLEAN DEFAULT false,
    min_cost DECIMAL(10,2),
    max_cost DECIMAL(10,2),
    
    -- Additional fields
    effective_from DATE,
    effective_to DATE,
    notes TEXT,
    tags TEXT[],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_updated_at_trigger ON services;
CREATE TRIGGER services_updated_at_trigger
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_services_updated_at();

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view services from their organization" ON services;
DROP POLICY IF EXISTS "Users can create services in their organization" ON services;
DROP POLICY IF EXISTS "Users can update services in their organization" ON services;
DROP POLICY IF EXISTS "Users can delete services from their organization" ON services;

-- Create RLS policies
CREATE POLICY "Users can view services from their organization" ON services
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create services in their organization" ON services
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update services in their organization" ON services
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete services from their organization" ON services
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

COMMIT;

-- Test the table
SELECT 'Basic services table created successfully' as status;

-- Show table structure
\d services;