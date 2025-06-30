-- =============================================
-- ENSURE ALL CLIENTS HAVE ORGANIZATION_ID
-- =============================================

-- Check for clients without organization_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM clients 
  WHERE organization_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % clients without organization_id', orphaned_count;
    
    -- For now, we'll just report this
    -- In production, you'd need to assign them to the correct org
    RAISE NOTICE 'These clients need to be assigned to an organization';
  ELSE
    RAISE NOTICE 'All clients have organization_id set correctly';
  END IF;
END $$;

-- Add a constraint to prevent future clients without org_id
-- (We'll make it NOT NULL after fixing existing data)
-- ALTER TABLE clients ALTER COLUMN organization_id SET NOT NULL;
