-- Fix service agreements RLS policies and add missing columns

-- First, check if organization_id column exists in service_agreements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'service_agreements' AND column_name = 'organization_id') THEN
        ALTER TABLE service_agreements ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing service_agreements to have organization_id from their client
UPDATE service_agreements 
SET organization_id = clients.organization_id
FROM clients 
WHERE service_agreements.client_id = clients.id 
AND service_agreements.organization_id IS NULL;

-- Check if organization_id column exists in agreement_buckets
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agreement_buckets' AND column_name = 'organization_id') THEN
        ALTER TABLE agreement_buckets ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing agreement_buckets to have organization_id from their service agreement
UPDATE agreement_buckets 
SET organization_id = service_agreements.organization_id
FROM service_agreements 
WHERE agreement_buckets.agreement_id = service_agreements.id 
AND agreement_buckets.organization_id IS NULL;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view service agreements in their organization" ON service_agreements;
DROP POLICY IF EXISTS "Users can create service agreements in their organization" ON service_agreements;
DROP POLICY IF EXISTS "Users can update service agreements in their organization" ON service_agreements;
DROP POLICY IF EXISTS "Users can delete service agreements in their organization" ON service_agreements;

DROP POLICY IF EXISTS "Users can view agreement buckets in their organization" ON agreement_buckets;
DROP POLICY IF EXISTS "Users can create agreement buckets in their organization" ON agreement_buckets;
DROP POLICY IF EXISTS "Users can update agreement buckets in their organization" ON agreement_buckets;
DROP POLICY IF EXISTS "Users can delete agreement buckets in their organization" ON agreement_buckets;

-- Create comprehensive RLS policies for service_agreements
CREATE POLICY "Users can view service agreements in their organization" ON service_agreements
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create service agreements in their organization" ON service_agreements
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update service agreements in their organization" ON service_agreements
  FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete service agreements in their organization" ON service_agreements
  FOR DELETE USING (organization_id = get_user_organization_id());

-- Create comprehensive RLS policies for agreement_buckets
CREATE POLICY "Users can view agreement buckets in their organization" ON agreement_buckets
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create agreement buckets in their organization" ON agreement_buckets
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update agreement buckets in their organization" ON agreement_buckets
  FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete agreement buckets in their organization" ON agreement_buckets
  FOR DELETE USING (organization_id = get_user_organization_id());

-- Ensure RLS is enabled
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_buckets ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_agreements_organization_id ON service_agreements(organization_id);
CREATE INDEX IF NOT EXISTS idx_agreement_buckets_organization_id ON agreement_buckets(organization_id);

-- Add remaining_balance column to service_agreements if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'service_agreements' AND column_name = 'remaining_balance') THEN
        ALTER TABLE service_agreements ADD COLUMN remaining_balance DECIMAL(10,2);
    END IF;
END $$;

-- Initialize remaining_balance to equal total_value for existing agreements
UPDATE service_agreements 
SET remaining_balance = total_value 
WHERE remaining_balance IS NULL;

-- Add current_balance column to agreement_buckets if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agreement_buckets' AND column_name = 'current_balance') THEN
        ALTER TABLE agreement_buckets ADD COLUMN current_balance DECIMAL(10,2);
    END IF;
END $$;

-- Initialize current_balance for existing buckets
UPDATE agreement_buckets 
SET current_balance = CASE 
  WHEN template_category = 'draw_down' THEN custom_amount
  WHEN template_category = 'fill_up' THEN 0
  ELSE custom_amount
END
WHERE current_balance IS NULL;
