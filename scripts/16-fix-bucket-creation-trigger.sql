-- =============================================
-- FIX BUCKET CREATION TRIGGER
-- Ensure organization_id is properly passed
-- =============================================

-- First, let's improve the bucket creation function to be more robust
CREATE OR REPLACE FUNCTION auto_create_client_buckets(client_id UUID)
RETURNS VOID AS $$
DECLARE
  client_org_id UUID;
  client_sah_level INTEGER;
  bucket_def RECORD;
  quarterly_budget DECIMAL(12,2);
  period_start DATE;
  period_end DATE;
BEGIN
  -- Get client organization and S@H level
  SELECT organization_id, sah_classification_level 
  INTO client_org_id, client_sah_level
  FROM clients 
  WHERE id = client_id;
  
  -- Ensure we have an organization_id
  IF client_org_id IS NULL THEN
    RAISE EXCEPTION 'Client % does not have an organization_id', client_id;
  END IF;
  
  RAISE NOTICE 'Creating buckets for client % in org %', client_id, client_org_id;
  
  -- Calculate current quarter dates
  period_start := DATE_TRUNC('quarter', CURRENT_DATE);
  period_end := (DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months - 1 day')::DATE;
  
  -- S@H Budget calculation based on classification level
  CASE client_sah_level
    WHEN 1 THEN quarterly_budget := 2737.71;
    WHEN 2 THEN quarterly_budget := 3995.42;
    WHEN 3 THEN quarterly_budget := 5479.94;
    WHEN 4 THEN quarterly_budget := 7190.79;
    WHEN 5 THEN quarterly_budget := 9128.97;
    WHEN 6 THEN quarterly_budget := 11294.48;
    WHEN 7 THEN quarterly_budget := 13687.32;
    WHEN 8 THEN quarterly_budget := 16307.49;
    ELSE quarterly_budget := 0.00;
  END CASE;
  
  RAISE NOTICE 'Calculated quarterly budget: %', quarterly_budget;
  
  -- Create buckets for all auto_create bucket definitions
  FOR bucket_def IN 
    SELECT * FROM bucket_definitions WHERE auto_create = true AND is_active = true
  LOOP
    RAISE NOTICE 'Creating bucket: %', bucket_def.bucket_name;
    
    INSERT INTO client_buckets (
      organization_id,
      client_id,
      bucket_definition_id,
      current_balance,
      available_balance,
      credit_limit,
      period_start,
      period_end
    ) VALUES (
      client_org_id, -- Explicitly use the client's org_id
      client_id,
      bucket_def.id,
      CASE 
        WHEN bucket_def.bucket_code = 'SAH_QUARTERLY' THEN quarterly_budget
        ELSE 0.00
      END,
      CASE 
        WHEN bucket_def.bucket_code = 'SAH_QUARTERLY' THEN quarterly_budget
        ELSE 0.00
      END,
      CASE 
        WHEN bucket_def.bucket_code = 'SAH_QUARTERLY' THEN quarterly_budget
        ELSE 0.00
      END,
      CASE 
        WHEN bucket_def.bucket_category = 'draw_down' THEN period_start
        ELSE NULL
      END,
      CASE 
        WHEN bucket_def.bucket_category = 'draw_down' THEN period_end
        ELSE NULL
      END
    );
    
    RAISE NOTICE 'Created bucket: % for client %', bucket_def.bucket_name, client_id;
  END LOOP;
  
  RAISE NOTICE 'Completed bucket creation for client %', client_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in auto_create_client_buckets: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger function handles the organization_id properly
CREATE OR REPLACE FUNCTION handle_client_bucket_creation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Client status change trigger fired: % -> %', OLD.status, NEW.status;
  
  -- When client becomes active, auto-create buckets
  IF OLD.status != 'active' AND NEW.status = 'active' THEN
    RAISE NOTICE 'Client becoming active, creating buckets for client %', NEW.id;
    
    -- Ensure the client has an organization_id
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create buckets: client % has no organization_id', NEW.id;
    END IF;
    
    PERFORM auto_create_client_buckets(NEW.id);
    RAISE NOTICE 'Bucket creation completed for client %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS client_activation_trigger ON clients;
CREATE TRIGGER client_activation_trigger
  AFTER UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION handle_client_bucket_creation();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_client_buckets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_client_bucket_creation() TO authenticated;
