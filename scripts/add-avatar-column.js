// Script to add avatar_url column to clients table
// Run this with: node scripts/add-avatar-column.js

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // You'll need to add this to .env.local

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addAvatarColumn() {
  try {
    console.log('Adding avatar_url column to clients table...')
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        
        COMMENT ON COLUMN clients.avatar_url IS 'URL for client profile picture - can be uploaded image or preset avatar';
      `
    })

    if (error) {
      console.error('Error adding column:', error)
      return
    }

    console.log('Successfully added avatar_url column to clients table!')
    
    // Verify the column was added
    const { data: columns, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'avatar_url';
      `
    })

    if (checkError) {
      console.error('Error verifying column:', checkError)
      return
    }

    console.log('Column verification:', columns)
    
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

addAvatarColumn()