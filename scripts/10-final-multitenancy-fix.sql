-- =============================================
-- SWIVEL CRM - FINAL MULTI-TENANCY FIX
-- Using the EXACT proven solution from context
-- =============================================

-- =============================================
-- STEP 1: ENSURE PROFILES TABLE STRUCTURE IS CORRECT
-- =============================================

-- Make sure all optional columns are nullable
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN qualifications DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN wwcc_number DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN wwcc_expiry DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN police_check_date DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN trial_ends_at DROP NOT NULL;

-- Ensure RLS is DISABLED (your critical breakthrough)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: RECREATE THE EXACT WORKING FUNCTIONS
-- From your proven solution
-- =============================================

-- The exact function that bypasses RLS (your breakthrough)
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

-- Simplified organization creation (following your pattern)
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
  -- Calculate trial end date
  trial_end_date := NOW() + INTERVAL '14 days';
  
  -- Create organization first
  INSERT INTO organizations (name, abn, phone, email)
  VALUES (organization_name, abn, phone, user_email)
  RETURNING id INTO new_org_id;
  
  -- Create profile (RLS disabled so this works)
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
-- STEP 3: THE EXACT TRIGGER THAT WORKED
-- From your proven solution
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract org details from user metadata (your exact pattern)
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

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 4: GRANT ALL NECESSARY PERMISSIONS
-- This was critical in your solution
-- =============================================

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION public.get_user_org_simple() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_organization_and_admin(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON organizations TO anon, authenticated, service_role;
GRANT ALL ON profiles TO anon, authenticated, service_role;

-- =============================================
-- STEP 5: VERIFY THE SOLUTION
-- =============================================
DO $$
BEGIN
  -- Check RLS is disabled on profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS correctly DISABLED on profiles table';
  ELSE
    RAISE NOTICE '❌ RLS still enabled on profiles - this will cause the error';
  END IF;
  
  RAISE NOTICE 'Applied your proven multi-tenancy solution!';
END $$;
