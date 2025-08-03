// Check the actual schema of the services table
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fueaxtpbudxxmpdfsakq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZWF4dHBidWR4eG1wZGZzYWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE5MTMsImV4cCI6MjA2Njc1NzkxM30.bMajdBe276XtuWXH4UG21DkCsLxEh1P4ZmPPMDKvzLk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  console.log('🔍 Checking services table schema...')
  
  try {
    // Try to select all columns to see what exists
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .limit(0) // Don't return data, just check columns
    
    if (error) {
      console.log('❌ Error accessing services table:', error.message)
      return
    }
    
    console.log('✅ Services table is accessible')
    
    // Try to insert a minimal record to see what columns are required/available
    const testData = {
      name: 'Test Service Schema Check',
      base_cost: 10.00,
      unit: 'hour'
    }
    
    console.log('🧪 Testing insert with minimal data:', testData)
    
    const { data: insertData, error: insertError } = await supabase
      .from('services')
      .insert(testData)
      .select()
    
    if (insertError) {
      console.log('❌ Insert error (this will show us what columns are missing/wrong):')
      console.log('   Message:', insertError.message)
      console.log('   Code:', insertError.code)
      console.log('   Details:', insertError.details)
      console.log('   Hint:', insertError.hint)
    } else {
      console.log('✅ Test insert successful:', insertData)
      
      // Clean up the test record
      if (insertData && insertData[0]?.id) {
        await supabase
          .from('services')
          .delete()
          .eq('id', insertData[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
    
  } catch (error) {
    console.error('💥 Script error:', error.message)
  }
}

checkSchema()