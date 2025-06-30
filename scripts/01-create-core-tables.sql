-- =============================================
-- SWIVEL CRM - CORE TABLES SETUP
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ORGANIZATIONS TABLE
-- =============================================
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abn TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  sah_registered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PROFILES TABLE (RLS DISABLED - CRITICAL!)
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'support_worker', -- admin, coordinator, support_worker
  qualifications TEXT[],
  wwcc_number TEXT, -- Working with Children Check
  wwcc_expiry DATE,
  police_check_date DATE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL: Disable RLS on profiles to prevent recursion
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- =============================================
-- CLIENTS TABLE
-- =============================================
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  sah_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_conditions TEXT[],
  medications TEXT[],
  support_goals TEXT[],
  funding_type TEXT, -- sah, private, aged_care
  plan_budget DECIMAL(10,2),
  plan_start_date DATE,
  plan_end_date DATE,
  status TEXT DEFAULT 'prospect', -- prospect, active, deactivated
  
  -- Support at Home Classification
  sah_classification_level INTEGER CHECK (sah_classification_level BETWEEN 1 AND 8),
  medicare_number TEXT,
  pension_type TEXT,
  myagedcare_number TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SERVICES TABLE
-- =============================================
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate DECIMAL(8,2),
  sah_support_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SHIFTS TABLE
-- =============================================
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  support_worker_id UUID REFERENCES profiles(id),
  service_id UUID REFERENCES services(id),
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  notes TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VISIT LOGS TABLE
-- =============================================
CREATE TABLE visit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID REFERENCES shifts(id),
  support_worker_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES clients(id),
  activities_completed TEXT[],
  goals_worked_on TEXT[],
  client_mood TEXT,
  incidents TEXT,
  next_visit_notes TEXT,
  family_communication TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- STAFF INVITATIONS TABLE
-- =============================================
CREATE TABLE staff_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'support_worker',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invitation_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  invoice_number TEXT UNIQUE NOT NULL,
  period_start DATE,
  period_end DATE,
  total_amount DECIMAL(10,2),
  gst_amount DECIMAL(10,2),
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INVOICE ITEMS TABLE
-- =============================================
CREATE TABLE invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  shift_id UUID REFERENCES shifts(id),
  description TEXT,
  hours DECIMAL(4,2),
  rate DECIMAL(8,2),
  amount DECIMAL(10,2)
);
