-- Create bucket_templates table for reusable bucket configurations
CREATE TABLE IF NOT EXISTS bucket_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category bucket_category NOT NULL,
    funding_source funding_source NOT NULL,
    starting_amount DECIMAL(10,2),
    credit_limit DECIMAL(10,2),
    characteristics JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT bucket_templates_org_name_unique UNIQUE (organization_id, name),
    CONSTRAINT bucket_templates_amount_check CHECK (
        (category = 'draw_down' AND starting_amount IS NOT NULL AND starting_amount > 0) OR
        (category = 'fill_up' AND credit_limit IS NOT NULL AND credit_limit > 0)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bucket_templates_org_id ON bucket_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_bucket_templates_category ON bucket_templates(category);
CREATE INDEX IF NOT EXISTS idx_bucket_templates_funding_source ON bucket_templates(funding_source);
CREATE INDEX IF NOT EXISTS idx_bucket_templates_active ON bucket_templates(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE bucket_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bucket_templates
CREATE POLICY "Users can view their organization's bucket templates"
    ON bucket_templates FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert bucket templates for their organization"
    ON bucket_templates FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's bucket templates"
    ON bucket_templates FOR UPDATE
    USING (organization_id = get_user_organization_id())
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's bucket templates"
    ON bucket_templates FOR DELETE
    USING (organization_id = get_user_organization_id());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_bucket_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bucket_templates_updated_at
    BEFORE UPDATE ON bucket_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_bucket_templates_updated_at();

-- Seed default bucket templates for existing organizations
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM organizations LOOP
        -- Insert default draw-down templates
        INSERT INTO bucket_templates (organization_id, name, description, category, funding_source, starting_amount, characteristics) VALUES
        (org_record.id, 'NDIS Core Supports', 'Core support activities funded by NDIS', 'draw_down', 'ndis', 25000.00, '[{"name": "Support Category", "value": "Core Supports"}, {"name": "Review Period", "value": "12 months"}]'),
        (org_record.id, 'NDIS Capacity Building', 'Capacity building supports from NDIS plan', 'draw_down', 'ndis', 15000.00, '[{"name": "Support Category", "value": "Capacity Building"}, {"name": "Review Period", "value": "12 months"}]'),
        (org_record.id, 'Private Pay Services', 'Services paid privately by client or family', 'draw_down', 'private', 10000.00, '[{"name": "Payment Terms", "value": "Monthly"}, {"name": "Invoice Frequency", "value": "Monthly"}]'),
        (org_record.id, 'Government Subsidy', 'Government funded support services', 'draw_down', 'government', 20000.00, '[{"name": "Program", "value": "Commonwealth Home Support"}, {"name": "Review Period", "value": "6 months"}]');
        
        -- Insert default fill-up templates
        INSERT INTO bucket_templates (organization_id, name, description, category, funding_source, credit_limit, characteristics) VALUES
        (org_record.id, 'NDIS Plan Management', 'Plan management services credit account', 'fill_up', 'ndis', 5000.00, '[{"name": "Service Type", "value": "Plan Management"}, {"name": "Billing Cycle", "value": "Monthly"}]'),
        (org_record.id, 'Emergency Support Fund', 'Emergency support services credit facility', 'fill_up', 'private', 3000.00, '[{"name": "Usage", "value": "Emergency Only"}, {"name": "Approval Required", "value": "Yes"}]'),
        (org_record.id, 'Respite Care Credit', 'Respite care services credit account', 'fill_up', 'government', 8000.00, '[{"name": "Service Type", "value": "Respite Care"}, {"name": "Pre-approval", "value": "Required"}]');
    END LOOP;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON bucket_templates TO authenticated;
GRANT USAGE ON SEQUENCE bucket_templates_id_seq TO authenticated;
