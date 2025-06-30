-- =============================================
-- SWIVEL CRM - SECURITY FUNCTIONS
-- =============================================

-- =============================================
-- MULTI-TENANCY HELPER FUNCTION (CRITICAL!)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_org_simple()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ORGANIZATION CREATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.create_organization_and_admin(
  user_id UUID,
  user_email TEXT,
  full_name TEXT,
  organization_name TEXT,
  abn TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  plan TEXT DEFAULT 'starter'
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
  trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate trial end date (14 days from now)
  trial_end_date := NOW() + INTERVAL '14 days';
  
  -- Create organization
  INSERT INTO organizations (name, abn, phone, email)
  VALUES (organization_name, abn, phone, user_email)
  RETURNING id INTO new_org_id;
  
  -- Create admin profile
  INSERT INTO profiles (
    id, 
    organization_id, 
    email, 
    full_name, 
    phone, 
    role, 
    trial_ends_at, 
    subscription_status
  )
  VALUES (
    user_id, 
    new_org_id, 
    user_email, 
    full_name, 
    phone, 
    'admin', 
    trial_end_date, 
    'trial'
  );
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- BUCKET AUTO-CREATION FUNCTION
-- =============================================
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
  
  -- Create buckets for all auto_create bucket definitions
  FOR bucket_def IN 
    SELECT * FROM bucket_definitions WHERE auto_create = true AND is_active = true
  LOOP
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
      client_org_id,
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
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- BUCKET TRANSACTION PROCESSING FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION create_bucket_transaction(
  p_client_id UUID,
  p_bucket_code VARCHAR,
  p_amount DECIMAL,
  p_transaction_type VARCHAR,
  p_description TEXT,
  p_source_type VARCHAR DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
  bucket_record RECORD;
  new_balance DECIMAL(12,2);
  transaction_id UUID;
  user_org_id UUID;
BEGIN
  -- Get user's organization
  user_org_id := public.get_user_org_simple();
  
  -- Get the client bucket
  SELECT cb.*, bd.bucket_category, bd.funding_source
  INTO bucket_record
  FROM client_buckets cb
  JOIN bucket_definitions bd ON cb.bucket_definition_id = bd.id
  WHERE cb.client_id = p_client_id 
    AND bd.bucket_code = p_bucket_code
    AND cb.organization_id = user_org_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bucket not found for client';
  END IF;
  
  -- Calculate new balance
  IF p_transaction_type = 'debit' THEN
    new_balance := bucket_record.current_balance - p_amount;
    
    -- Validate sufficient funds for draw-down buckets
    IF bucket_record.bucket_category = 'draw_down' AND new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient funds in bucket. Available: $%, Requested: $%', 
        bucket_record.current_balance, p_amount;
    END IF;
  ELSE
    new_balance := bucket_record.current_balance + p_amount;
  END IF;
  
  -- Create transaction record
  INSERT INTO bucket_transactions (
    organization_id,
    client_bucket_id,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_type,
    created_by
  ) VALUES (
    user_org_id,
    bucket_record.id,
    p_transaction_type,
    p_amount,
    new_balance,
    p_description,
    p_source_type,
    auth.uid()
  ) RETURNING id INTO transaction_id;
  
  -- Update bucket balance
  UPDATE client_buckets 
  SET 
    current_balance = new_balance,
    available_balance = CASE 
      WHEN bucket_category = 'draw_down' THEN new_balance
      ELSE available_balance
    END,
    updated_at = NOW()
  WHERE id = bucket_record.id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
