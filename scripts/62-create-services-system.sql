-- Create Services System
-- This creates the core services table and related functionality

BEGIN;

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Core service information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_code VARCHAR(50), -- Unique code for the service (optional)
    
    -- Pricing information
    base_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost_currency VARCHAR(3) DEFAULT 'AUD',
    unit VARCHAR(20) NOT NULL DEFAULT 'each' CHECK (unit IN ('each', 'minute', 'hour', 'day', 'week', 'month', 'year')),
    
    -- Service rules and configuration
    allow_discount BOOLEAN DEFAULT true,
    can_be_cancelled BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    is_taxable BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5,2) DEFAULT 10.00, -- GST rate in Australia
    
    -- Service categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Service availability
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    
    -- Pricing flexibility
    has_variable_pricing BOOLEAN DEFAULT false,
    min_cost DECIMAL(10,2),
    max_cost DECIMAL(10,2),
    
    -- Additional metadata
    notes TEXT,
    tags TEXT[], -- Array of tags for flexible categorization
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_service_code ON services(service_code);
CREATE INDEX IF NOT EXISTS idx_services_effective_dates ON services(effective_from, effective_to);

-- Create unique constraint on service_code per organization (optional codes must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_org_code ON services(organization_id, service_code) 
    WHERE service_code IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_updated_at_trigger
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_services_updated_at();

-- Create RLS policies for services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view services from their organization
CREATE POLICY "Users can view services from their organization" ON services
    FOR SELECT USING (
        organization_id = get_user_organization_id()
    );

-- Policy: Users can create services in their organization
CREATE POLICY "Users can create services in their organization" ON services
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
    );

-- Policy: Users can update services in their organization
CREATE POLICY "Users can update services in their organization" ON services
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
    );

-- Policy: Users can delete services from their organization
CREATE POLICY "Users can delete services from their organization" ON services
    FOR DELETE USING (
        organization_id = get_user_organization_id()
    );

-- Create service pricing history table for tracking cost changes
CREATE TABLE IF NOT EXISTS service_pricing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Historical pricing data
    cost DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    currency VARCHAR(3) DEFAULT 'AUD',
    
    -- Effective period
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    
    -- Reason for change
    change_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Create indexes for pricing history
CREATE INDEX IF NOT EXISTS idx_service_pricing_history_service_id ON service_pricing_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_history_effective ON service_pricing_history(effective_from, effective_to);

-- RLS for pricing history
ALTER TABLE service_pricing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pricing history for their organization services" ON service_pricing_history
    FOR SELECT USING (
        service_id IN (
            SELECT id FROM services WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can create pricing history for their organization services" ON service_pricing_history
    FOR INSERT WITH CHECK (
        service_id IN (
            SELECT id FROM services WHERE organization_id = get_user_organization_id()
        )
    );

-- Insert some sample service categories and common services
INSERT INTO services (organization_id, name, description, base_cost, unit, category, service_code, created_at) VALUES
    -- These are examples - will be filtered by organization_id in real use
    ((SELECT id FROM organizations LIMIT 1), 'Personal Care Support', 'Assistance with personal hygiene, dressing, and grooming', 45.00, 'hour', 'Core Supports', 'PC001', NOW()),
    ((SELECT id FROM organizations LIMIT 1), 'Community Access', 'Support to access community activities and services', 50.00, 'hour', 'Core Supports', 'CA001', NOW()),
    ((SELECT id FROM organizations LIMIT 1), 'Domestic Assistance', 'Help with household tasks and maintenance', 40.00, 'hour', 'Core Supports', 'DA001', NOW()),
    ((SELECT id FROM organizations LIMIT 1), 'Transport Support', 'Assistance with transportation to appointments and activities', 0.85, 'minute', 'Core Supports', 'TS001', NOW()),
    ((SELECT id FROM organizations LIMIT 1), 'Behavioural Support', 'Specialized behavioural intervention services', 120.00, 'hour', 'Capacity Building', 'BS001', NOW())
ON CONFLICT DO NOTHING; -- Prevent duplicates if run multiple times

COMMIT;

-- Show the created tables and some sample data
SELECT 'Services table created successfully' as status;
SELECT COUNT(*) as sample_services_count FROM services;