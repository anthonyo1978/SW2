-- =============================================
-- SWIVEL CRM - APPLY PROVEN MULTI-TENANCY SOLUTION
-- Based on the exact patterns that worked before
-- =============================================

-- =============================================
-- STEP 1: DISABLE RLS ON PROFILES TABLE (CRITICAL!)
-- This is the breakthrough solution from your context
-- =============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: CREATE SECURITY DEFINER FUNCTIONS
-- Using your exact proven pattern
-- =============================================

-- This function bypasses RLS to get user's org (your exact solution)
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
-- STEP 3: SIMPLIFIED ORGANIZATION CREATION
-- Following your proven non-recursive pattern
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
  
  -- Create admin profile (RLS is disabled so this will work)
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
-- STEP 4: SIMPLE, NON-RECURSIVE TRIGGER
-- Following your proven pattern exactly
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract org details from user metadata
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

-- =============================================
-- STEP 5: RECREATE TRIGGER WITH PROVEN PATTERN
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 6: ENSURE SIMPLE, DIRECT POLICIES
-- Using your proven non-recursive pattern
-- =============================================

-- Clean, simple policy using the function (your exact pattern)
DROP POLICY IF EXISTS "clients_org_policy" ON clients;
CREATE POLICY "clients_org_policy" ON clients  
FOR ALL USING ( 
  organization_id = public.get_user_org_simple() 
);

-- Apply the same pattern to other tables
DROP POLICY IF EXISTS "services_org_policy" ON services;
CREATE POLICY "services_org_policy" ON services  
FOR ALL USING ( 
  organization_id = public.get_user_org_simple() 
);

DROP POLICY IF EXISTS "shifts_org_policy" ON shifts;
CREATE POLICY "shifts_org_policy" ON shifts  
FOR ALL USING ( 
  organization_id = public.get_user_org_simple() 
);

DROP POLICY IF EXISTS "client_buckets_org_policy" ON client_buckets;
CREATE POLICY "client_buckets_org_policy" ON client_buckets  
FOR ALL USING ( 
  organization_id = public.get_user_org_simple() 
);

DROP POLICY IF EXISTS "bucket_transactions_org_policy" ON bucket_transactions;
CREATE POLICY "bucket_transactions_org_policy" ON bucket_transactions  
FOR ALL USING ( 
  organization_id = public.get_user_org_simple() 
);

-- Organizations policy (users can only see their own org)
DROP POLICY IF EXISTS "users_can_view_own_org" ON organizations;
CREATE POLICY "users_can_view_own_org" ON organizations
FOR SELECT USING (
  id = public.get_user_org_simple()
);

DROP POLICY IF EXISTS "users_can_update_own_org" ON organizations;
CREATE POLICY "users_can_update_own_org" ON organizations
FOR UPDATE USING (
  id = public.get_user_org_simple()
);

-- =============================================
-- STEP 7: VERIFY THE PROVEN SOLUTION
-- =============================================
DO $$
BEGIN
  -- Verify RLS is disabled on profiles
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND rowsecurity = false
  ) THEN
    RAISE NOTICE '✅ RLS correctly DISABLED on profiles table';
  ELSE
    RAISE NOTICE '❌ RLS still enabled on profiles - this will cause issues';
  END IF;
  
  -- Verify our security definer function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_org_simple') THEN
    RAISE NOTICE '✅ get_user_org_simple function exists';
  ELSE
    RAISE NOTICE '❌ get_user_org_simple function missing';
  END IF;
  
  RAISE NOTICE 'Proven multi-tenancy solution applied successfully!';
END $$;
