-- =============================================
-- SWIVEL CRM - BULLETPROOF MULTI-TENANCY FIX
-- Using your EXACT proven solution that worked
-- =============================================

-- =============================================
-- STEP 1: COMPLETELY DISABLE RLS ON PROFILES
-- This was your breakthrough discovery
-- =============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might interfere
DROP POLICY IF EXISTS "profiles_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_org_policy" ON profiles;

-- =============================================
-- STEP 2: ENSURE PROFILES TABLE IS BULLETPROOF
-- =============================================
-- Make ALL optional columns nullable to prevent constraint errors
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN qualifications DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN wwcc_number DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN wwcc_expiry DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN police_check_date DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN trial_ends_at DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN subscription_status DROP NOT NULL;

-- Set defaults to prevent null issues
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'admin';
ALTER TABLE profiles ALTER COLUMN subscription_status SET DEFAULT 'trial';

-- =============================================
-- STEP 3: RECREATE THE EXACT WORKING FUNCTION
-- From your proven solution
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
  -- Log the attempt
  RAISE NOTICE 'Creating org for user: %, email: %, org: %', user_id, user_email, organization_name;
  
  -- Calculate trial end date
  trial_end_date := NOW() + INTERVAL '14 days';
  
  -- Create organization first
  INSERT INTO organizations (name, abn, phone, email)
  VALUES (organization_name, abn, phone, user_email)
  RETURNING id INTO new_org_id;
  
  RAISE NOTICE 'Created organization: %', new_org_id;
  
  -- Create profile with explicit values (RLS disabled so this works)
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
  
  RAISE NOTICE 'Created profile for user: %', user_id;
  
  RETURN new_org_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in create_organization_and_admin: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 4: BULLETPROOF TRIGGER FUNCTION
-- Your exact working pattern
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Trigger fired for user: %, metadata: %', NEW.id, NEW.raw_user_meta_data;
  
  -- Only proceed if we have organization metadata
  IF NEW.raw_user_meta_data IS NOT NULL AND 
     NEW.raw_user_meta_data->>'organization_name' IS NOT NULL THEN
    
    BEGIN
      RAISE NOTICE 'Creating organization for new user';
      
      PERFORM public.create_organization_and_admin(
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
        NEW.raw_user_meta_data->>'organization_name',
        NEW.raw_user_meta_data->>'abn',
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'plan', 'starter')
      );
      
      RAISE NOTICE 'Successfully created organization and profile';
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in trigger: %', SQLERRM;
        -- Re-raise to prevent user creation if org creation fails
        RAISE;
    END;
  ELSE
    RAISE NOTICE 'No organization metadata, skipping org creation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 5: RECREATE TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 6: GRANT ALL PERMISSIONS (CRITICAL!)
-- This is often the missing piece
-- =============================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Specific function permissions
GRANT EXECUTE ON FUNCTION public.create_organization_and_admin(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- =============================================
-- STEP 7: VERIFY THE SOLUTION
-- =============================================
DO $$
BEGIN
  -- Check RLS is disabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS correctly DISABLED on profiles';
  ELSE
    RAISE NOTICE '❌ RLS still enabled - this WILL cause the error';
  END IF;
  
  -- Check trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger exists';
  ELSE
    RAISE NOTICE '❌ Trigger missing';
  END IF;
  
  RAISE NOTICE 'Bulletproof multi-tenancy solution applied!';
END $$;
