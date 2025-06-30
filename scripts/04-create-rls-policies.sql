-- =============================================
-- SWIVEL CRM - ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables (except profiles - already disabled)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ORGANIZATIONS POLICIES
-- =============================================
CREATE POLICY "users_can_view_own_org" ON organizations
FOR SELECT USING (
  id = public.get_user_org_simple()
);

CREATE POLICY "users_can_update_own_org" ON organizations
FOR UPDATE USING (
  id = public.get_user_org_simple()
);

-- =============================================
-- CLIENTS POLICIES
-- =============================================
CREATE POLICY "clients_org_isolation" ON clients
FOR ALL USING (
  organization_id = public.get_user_org_simple()
);

-- =============================================
-- SERVICES POLICIES
-- =============================================
CREATE POLICY "services_org_isolation" ON services
FOR ALL USING (
  organization_id = public.get_user_org_simple()
);

-- =============================================
-- SHIFTS POLICIES
-- =============================================
CREATE POLICY "shifts_org_isolation" ON shifts
FOR ALL USING (
  organization_id = public.get_user_org_simple()
);

-- =============================================
-- VISIT LOGS POLICIES
-- =============================================
CREATE POLICY "visit_logs_org_isolation" ON visit_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM shifts s 
    WHERE s.id = visit_logs.shift_id 
    AND s.organization_id = public.get_user_org_simple()
  )
);

-- =============================================
-- STAFF INVITATIONS POLICIES
-- =============================================
CREATE POLICY "staff_invitations_org_isolation" ON staff_invitations
FOR ALL USING (
  organization_id = public.get_user_org_simple()
);

-- =============================================
-- INVOICES POLICIES
-- =============================================
CREATE POLICY "invoices_org_isolation" ON invoices
FOR ALL USING (
  organization_id = public.get_user_org_simple()
);

-- =============================================
-- INVOICE ITEMS POLICIES
-- =============================================
CREATE POLICY "invoice_items_org_isolation" ON invoice_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_items.invoice_id 
    AND i.organization_id = public.get_user_org_simple()
  )
);

-- =============================================
-- CLIENT BUCKETS POLICIES
-- =============================================
CREATE POLICY "client_buckets_org_isolation" ON client_buckets
FOR ALL USING (
  organization_id = public.get_user_org_simple()
);

-- =============================================
-- BUCKET TRANSACTIONS POLICIES
-- =============================================
CREATE POLICY "bucket_transactions_org_isolation" ON bucket_transactions
FOR ALL USING (
  organization_id = public.get_user_org_simple()
);

-- =============================================
-- BUCKET DEFINITIONS (PUBLIC READ)
-- =============================================
ALTER TABLE bucket_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bucket_definitions_public_read" ON bucket_definitions
FOR SELECT USING (true);
