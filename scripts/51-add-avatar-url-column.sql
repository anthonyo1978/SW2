-- Add avatar_url column to clients table
-- This will store either uploaded image URLs or preset avatar URLs

BEGIN;

-- Add the avatar_url column to the clients table
ALTER TABLE clients 
ADD COLUMN avatar_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN clients.avatar_url IS 'URL for client profile picture - can be uploaded image or preset avatar';

COMMIT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'avatar_url';