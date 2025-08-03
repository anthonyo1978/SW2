-- Fix services table by adding missing columns
-- Run this in your Supabase SQL editor

BEGIN;

-- First let's see what exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'services' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add base_cost column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'base_cost') THEN
        ALTER TABLE services ADD COLUMN base_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00;
    END IF;
    
    -- Add cost_currency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'cost_currency') THEN
        ALTER TABLE services ADD COLUMN cost_currency VARCHAR(3) DEFAULT 'AUD';
    END IF;
    
    -- Add unit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'unit') THEN
        ALTER TABLE services ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'hour';
    END IF;
    
    -- Add service rules columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'allow_discount') THEN
        ALTER TABLE services ADD COLUMN allow_discount BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'can_be_cancelled') THEN
        ALTER TABLE services ADD COLUMN can_be_cancelled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'requires_approval') THEN
        ALTER TABLE services ADD COLUMN requires_approval BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_taxable') THEN
        ALTER TABLE services ADD COLUMN is_taxable BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'tax_rate') THEN
        ALTER TABLE services ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 10.00;
    END IF;
    
    -- Add categorization columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'category') THEN
        ALTER TABLE services ADD COLUMN category VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'subcategory') THEN
        ALTER TABLE services ADD COLUMN subcategory VARCHAR(100);
    END IF;
    
    -- Add status and availability columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'status') THEN
        ALTER TABLE services ADD COLUMN status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'archived'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_active') THEN
        ALTER TABLE services ADD COLUMN is_active BOOLEAN DEFAULT false;
    END IF;
    
    -- Add variable pricing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'has_variable_pricing') THEN
        ALTER TABLE services ADD COLUMN has_variable_pricing BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'min_cost') THEN
        ALTER TABLE services ADD COLUMN min_cost DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'max_cost') THEN
        ALTER TABLE services ADD COLUMN max_cost DECIMAL(10,2);
    END IF;
    
    -- Add additional fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'effective_from') THEN
        ALTER TABLE services ADD COLUMN effective_from DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'effective_to') THEN
        ALTER TABLE services ADD COLUMN effective_to DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'notes') THEN
        ALTER TABLE services ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'tags') THEN
        ALTER TABLE services ADD COLUMN tags TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'service_code') THEN
        ALTER TABLE services ADD COLUMN service_code VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'description') THEN
        ALTER TABLE services ADD COLUMN description TEXT;
    END IF;
    
    -- Add audit fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'created_by') THEN
        ALTER TABLE services ADD COLUMN created_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'updated_by') THEN
        ALTER TABLE services ADD COLUMN updated_by UUID;
    END IF;
    
    -- Add updated_at trigger if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'updated_at') THEN
        ALTER TABLE services ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

END $$;

-- Create or recreate the updated_at trigger
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_service_code ON services(service_code);

COMMIT;

-- Show final table structure
SELECT 'Services table columns added successfully' as status;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'services' 
ORDER BY ordinal_position;