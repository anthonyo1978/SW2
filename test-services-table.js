// Test if services table exists and create it if needed
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fueaxtpbudxxmpdfsakq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZWF4dHBidWR4eG1wZGZzYWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE5MTMsImV4cCI6MjA2Njc1NzkxM30.bMajdBe276XtuWXH4UG21DkCsLxEh1P4ZmPPMDKvzLk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkServicesTable() {
  console.log('🔍 Checking services table...')
  
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Error:', error.message)
      
      if (error.message.includes('relation "services" does not exist')) {
        console.log('\n📋 SERVICES TABLE DOES NOT EXIST')
        console.log('🔧 You need to create it manually in Supabase SQL editor')
        console.log('\n📝 INSTRUCTIONS:')
        console.log('1. Go to: https://supabase.com/dashboard/project/fueaxtpbudxxmpdfsakq/sql')
        console.log('2. Copy the entire contents of: scripts/64-create-basic-services-table.sql')
        console.log('3. Paste it into the SQL editor')
        console.log('4. Click "Run" to execute')
        console.log('\n⚠️  This is why service creation is failing with empty error {}')
      }
    } else {
      console.log('✅ Services table exists!')
      console.log('📊 Data returned:', data)
    }
  } catch (error) {
    console.error('💥 Connection error:', error.message)
  }
}

checkServicesTable()