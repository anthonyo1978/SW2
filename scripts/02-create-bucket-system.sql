-- =============================================
-- SWIVEL CRM - BUCKET SYSTEM TABLES
-- =============================================

-- =============================================
-- BUCKET DEFINITIONS TABLE
-- =============================================
CREATE TABLE bucket_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_code VARCHAR(50) UNIQUE NOT NULL,
  bucket_name VARCHAR(200) NOT NULL,
  bucket_category VARCHAR(20) NOT NULL, -- 'draw_down' or 'fill_up'
  funding_source VARCHAR(50) NOT NULL, -- 'government', 'client', 'insurance'
  auto_create BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CLIENT BUCKETS TABLE
-- =============================================
CREATE TABLE client_buckets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  bucket_definition_id UUID NOT NULL REFERENCES bucket_definitions(id),
  current_balance DECIMAL(12,2) DEFAULT 0.00,
  available_balance DECIMAL(12,2) DEFAULT 0.00,
  credit_limit DECIMAL(12,2) DEFAULT 0.00,
  period_start DATE,
  period_end DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- BUCKET TRANSACTIONS TABLE
-- =============================================
CREATE TABLE bucket_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_bucket_id UUID NOT NULL REFERENCES client_buckets(id),
  transaction_type VARCHAR(20) NOT NULL, -- 'credit', 'debit'
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(50), -- 'service_transaction', 'manual_adjustment', 'government_allocation'
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SEED BUCKET DEFINITIONS
-- =============================================
INSERT INTO bucket_definitions (bucket_code, bucket_name, bucket_category, funding_source, auto_create, display_order) VALUES
('SAH_QUARTERLY', 'Support at Home - Quarterly Allocation', 'draw_down', 'government', true, 1),
('CLIENT_CONTRIBUTION', 'Client Contribution Fees', 'fill_up', 'client', true, 2),
('TRANSPORT_FEES', 'Transport and Travel Costs', 'fill_up', 'client', false, 3),
('EQUIPMENT_HIRE', 'Equipment Rental Fees', 'fill_up', 'client', false, 4),
('MEAL_SERVICES', 'Meal Delivery Services', 'fill_up', 'client', false, 5),
('RESPITE_CARE', 'Respite Care Services', 'draw_down', 'government', false, 6),
('ALLIED_HEALTH', 'Allied Health Services', 'draw_down', 'government', false, 7);
