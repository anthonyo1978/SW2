-- TEMPORARY: Disable RLS on clients table for testing
-- We'll re-enable it once we confirm the issue

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'clients' AND schemaname = 'public';

-- Should show rowsecurity = false
