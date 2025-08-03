// Debug service creation issue
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fueaxtpbudxxmpdfsakq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZWF4dHBidWR4eG1wZGZzYWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE5MTMsImV4cCI6MjA2Njc1NzkxM30.bMajdBe276XtuWXH4UG21DkCsLxEh1P4ZmPPMDKvzLk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugServiceCreation() {
  console.log('🔍 Testing service creation...')
  
  try {
    // First check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('👤 User:', user ? user.id : 'Not authenticated')
    console.log('🔐 User error:', userError?.message || 'None')
    
    if (!user) {
      console.log('❌ User not authenticated - this is likely the issue!')
      console.log('💡 The service creation form requires authentication')
      return
    }
    
    // Check user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    console.log('👥 Profile:', profile)
    console.log('🏢 Profile error:', profileError?.message || 'None')
    
    if (!profile?.organization_id) {
      console.log('❌ No organization_id found - this is likely the issue!')
      return
    }
    
    // Try to create a test service
    const testServiceData = {
      organization_id: profile.organization_id,
      name: 'Test Service',
      description: 'Test service for debugging',
      base_cost: 50.00,
      cost_currency: 'AUD',
      unit: 'hour',
      status: 'draft',
      is_active: false,
      allow_discount: true,
      can_be_cancelled: true,
      requires_approval: false,
      is_taxable: true,
      tax_rate: 10.00,
      has_variable_pricing: false,
      created_by: user.id,
      updated_by: user.id,
    }
    
    console.log('📝 Attempting to create service with data:', testServiceData)
    
    const { data, error } = await supabase
      .from('services')
      .insert(testServiceData)
      .select()
      .single()
    
    console.log('📊 Insert result - data:', data)
    console.log('❌ Insert result - error:', error)
    
    if (error) {
      console.log('🔍 Detailed error analysis:')
      console.log('  - Code:', error.code)
      console.log('  - Message:', error.message)
      console.log('  - Details:', error.details)
      console.log('  - Hint:', error.hint)
    }
    
  } catch (error) {
    console.error('💥 Script error:', error.message)
  }
}

debugServiceCreation()