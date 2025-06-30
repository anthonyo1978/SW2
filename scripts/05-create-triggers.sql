-- =============================================
-- SWIVEL CRM - TRIGGERS AND AUTOMATION
-- =============================================

-- =============================================
-- USER CREATION TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create organization if user has organization metadata
  IF NEW.raw_user_meta_data->>'organization_name' IS NOT NULL THEN
    PERFORM public.create_organization_and_admin(
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'organization_name',
      NEW.raw_user_meta_data->>'abn',
      NEW.raw_user_meta_data->>'phone',
      COALESCE(NEW.raw_user_meta_data->>'plan', 'starter')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- CLIENT ACTIVATION TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION handle_client_bucket_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- When client becomes active, auto-create buckets
  IF OLD.status != 'active' AND NEW.status = 'active' THEN
    PERFORM auto_create_client_buckets(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER client_activation_trigger
  AFTER UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION handle_client_bucket_creation();

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_buckets_updated_at BEFORE UPDATE ON client_buckets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
