-- =============================================
-- SERVICE AGREEMENTS TABLES
-- =============================================

-- Service Agreements table
CREATE TABLE service_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  agreement_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'current', 'expired')),
  start_date DATE NOT NULL,
  end_date DATE,
  total_value DECIMAL(12,2) DEFAULT 0,
  has_been_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique agreement numbers per organization
  UNIQUE(organization_id, agreement_number)
);

-- Agreement Buckets table (instances of bucket templates in agreements)
CREATE TABLE agreement_buckets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  agreement_id UUID REFERENCES service_agreements(id) ON DELETE CASCADE NOT NULL,
  bucket_template_id UUID, -- Reference to bucket templates (when we create that table)
  template_name TEXT NOT NULL, -- Store template name for reference
  template_category TEXT NOT NULL CHECK (template_category IN ('draw_down', 'fill_up')),
  template_funding_source TEXT NOT NULL,
  custom_name TEXT,
  custom_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_service_agreements_client_id ON service_agreements(client_id);
CREATE INDEX idx_service_agreements_organization_id ON service_agreements(organization_id);
CREATE INDEX idx_service_agreements_status ON service_agreements(status);
CREATE INDEX idx_agreement_buckets_agreement_id ON agreement_buckets(agreement_id);
CREATE INDEX idx_agreement_buckets_organization_id ON agreement_buckets(organization_id);

-- RLS Policies
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_buckets ENABLE ROW LEVEL SECURITY;

-- Service Agreements policies (using the correct function name)
CREATE POLICY "Users can view service agreements in their organization" ON service_agreements
  FOR SELECT USING (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can insert service agreements in their organization" ON service_agreements
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can update service agreements in their organization" ON service_agreements
  FOR UPDATE USING (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can delete service agreements in their organization" ON service_agreements
  FOR DELETE USING (organization_id = public.get_user_org_simple());

-- Agreement Buckets policies (using the correct function name)
CREATE POLICY "Users can view agreement buckets in their organization" ON agreement_buckets
  FOR SELECT USING (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can insert agreement buckets in their organization" ON agreement_buckets
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can update agreement buckets in their organization" ON agreement_buckets
  FOR UPDATE USING (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can delete agreement buckets in their organization" ON agreement_buckets
  FOR DELETE USING (organization_id = public.get_user_org_simple());

-- Function to update agreement total value when buckets change
CREATE OR REPLACE FUNCTION update_agreement_total_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the total value of the agreement
  UPDATE service_agreements 
  SET 
    total_value = (
      SELECT COALESCE(SUM(custom_amount), 0)
      FROM agreement_buckets 
      WHERE agreement_id = COALESCE(NEW.agreement_id, OLD.agreement_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.agreement_id, OLD.agreement_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update agreement total when buckets change
CREATE TRIGGER update_agreement_total_on_bucket_insert
  AFTER INSERT ON agreement_buckets
  FOR EACH ROW EXECUTE FUNCTION update_agreement_total_value();

CREATE TRIGGER update_agreement_total_on_bucket_update
  AFTER UPDATE ON agreement_buckets
  FOR EACH ROW EXECUTE FUNCTION update_agreement_total_value();

CREATE TRIGGER update_agreement_total_on_bucket_delete
  AFTER DELETE ON agreement_buckets
  FOR EACH ROW EXECUTE FUNCTION update_agreement_total_value();
