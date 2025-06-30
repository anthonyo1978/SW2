-- =============================================
-- SWIVEL CRM - PERFORMANCE INDEXES
-- =============================================

-- =============================================
-- MULTI-TENANCY INDEXES (CRITICAL!)
-- =============================================
CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_services_organization ON services(organization_id);
CREATE INDEX idx_shifts_organization ON shifts(organization_id);
CREATE INDEX idx_staff_invitations_organization ON staff_invitations(organization_id);
CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_client_buckets_organization ON client_buckets(organization_id);
CREATE INDEX idx_bucket_transactions_organization ON bucket_transactions(organization_id);

-- =============================================
-- BUCKET SYSTEM INDEXES
-- =============================================
CREATE INDEX idx_client_buckets_client ON client_buckets(client_id);
CREATE INDEX idx_bucket_transactions_bucket ON bucket_transactions(client_bucket_id);
CREATE INDEX idx_bucket_definitions_code ON bucket_definitions(bucket_code);
CREATE INDEX idx_bucket_definitions_auto_create ON bucket_definitions(auto_create) WHERE auto_create = true;

-- =============================================
-- QUERY OPTIMIZATION INDEXES
-- =============================================
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_sah_level ON clients(sah_classification_level);
CREATE INDEX idx_shifts_scheduled_start ON shifts(scheduled_start);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_bucket_transactions_date ON bucket_transactions(processed_at);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_staff_invitations_token ON staff_invitations(invitation_token);
CREATE INDEX idx_staff_invitations_status ON staff_invitations(status);

-- =============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- =============================================
CREATE INDEX idx_client_buckets_client_bucket ON client_buckets(client_id, bucket_definition_id);
CREATE INDEX idx_shifts_client_date ON shifts(client_id, scheduled_start);
CREATE INDEX idx_bucket_transactions_client_date ON bucket_transactions(client_bucket_id, processed_at);
