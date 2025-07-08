-- Drop existing policies
DROP POLICY IF EXISTS "Users can view bucket templates from their organization" ON bucket_templates;
DROP POLICY IF EXISTS "Users can insert bucket templates for their organization" ON bucket_templates;
DROP POLICY IF EXISTS "Users can update bucket templates from their organization" ON bucket_templates;
DROP POLICY IF EXISTS "Users can delete bucket templates from their organization" ON bucket_templates;

-- Create new policies using the correct function name
CREATE POLICY "Users can view bucket templates from their organization" ON bucket_templates
    FOR SELECT USING (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can insert bucket templates for their organization" ON bucket_templates
    FOR INSERT WITH CHECK (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can update bucket templates from their organization" ON bucket_templates
    FOR UPDATE USING (organization_id = public.get_user_org_simple());

CREATE POLICY "Users can delete bucket templates from their organization" ON bucket_templates
    FOR DELETE USING (organization_id = public.get_user_org_simple());

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'bucket_templates';
