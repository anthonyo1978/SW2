-- Fix RLS policies for contract_boxes to allow proper CRUD operations
-- The issue is likely that users can't DELETE contract boxes

BEGIN;

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'contract_boxes'
ORDER BY policyname;

-- Drop existing policies for contract_boxes
DROP POLICY IF EXISTS "Users can view boxes from their organization contracts" ON contract_boxes;
DROP POLICY IF EXISTS "Users can create boxes in their organization contracts" ON contract_boxes;
DROP POLICY IF EXISTS "Users can update boxes in their organization contracts" ON contract_boxes;

-- Create comprehensive policies that include DELETE permissions
CREATE POLICY "Users can view boxes from their organization contracts" ON contract_boxes
    FOR SELECT USING (
        contract_id IN (
            SELECT id FROM contracts WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can create boxes in their organization contracts" ON contract_boxes
    FOR INSERT WITH CHECK (
        contract_id IN (
            SELECT id FROM contracts WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can update boxes in their organization contracts" ON contract_boxes
    FOR UPDATE USING (
        contract_id IN (
            SELECT id FROM contracts WHERE organization_id = get_user_organization_id()
        )
    );

-- ADD MISSING DELETE POLICY
CREATE POLICY "Users can delete boxes from their organization contracts" ON contract_boxes
    FOR DELETE USING (
        contract_id IN (
            SELECT id FROM contracts WHERE organization_id = get_user_organization_id()
        )
    );

COMMIT;

-- Test the policies by checking them again
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'contract_boxes'
ORDER BY policyname;