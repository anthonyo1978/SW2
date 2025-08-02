// Test database connection and create services table
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔗 Connecting to Supabase...')
console.log('URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    // First test if we can connect
    console.log('🧪 Testing connection...')
    
    // Check if services table exists
    const { data, error } = await supabase
      .from('services')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Services table error:', error.message)
      
      if (error.message.includes('relation "services" does not exist')) {
        console.log('📋 Services table does not exist')
        console.log('🔧 You need to run the SQL migration scripts manually in your Supabase dashboard')
        console.log('📂 Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql')
        console.log('📝 Copy and paste the contents of: scripts/64-create-basic-services-table.sql')
        console.log('▶️ Then click "Run" to execute the script')
      }
    } else {
      console.log('✅ Services table exists and is accessible')
      console.log('📊 Found', data?.length || 0, 'services')
    }
    
    // Test organizations table access
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    
    if (orgError) {
      console.log('❌ Organizations table error:', orgError.message)
    } else {
      console.log('✅ Organizations table accessible')
    }
    
    // Test profiles table access
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (profileError) {
      console.log('❌ Profiles table error:', profileError.message)
    } else {
      console.log('✅ Profiles table accessible')
    }
    
  } catch (error) {
    console.error('💥 Connection test failed:', error.message)
  }
}

testConnection()