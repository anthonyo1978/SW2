const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
  try {
    console.log('🔍 Checking service categories...\n');
    
    // Check all service categories
    const { data: allCategories, error: allError } = await supabase
      .from('service_categories')
      .select('*')
      .order('sort_order');
    
    if (allError) {
      console.error('❌ Error fetching categories:', allError);
      return;
    }
    
    console.log(`Found ${allCategories.length} total service categories:`);
    allCategories.forEach(cat => {
      console.log(`   • ${cat.name} (Active: ${cat.is_active}, Color: ${cat.color})`);
    });
    
    // Check active categories specifically
    const { data: activeCategories, error: activeError } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (activeError) {
      console.error('❌ Error fetching active categories:', activeError);
      return;
    }
    
    console.log(`\n${activeCategories.length} active service categories:`);
    activeCategories.forEach(cat => {
      console.log(`   • ${cat.name} (${cat.color})`);
    });
    
    if (activeCategories.length === 0) {
      console.log('\n⚠️  No active service categories found!');
      console.log('The dropdown will only show "No restriction (flexible box)"');
      console.log('\nTo see categories in the dropdown:');
      console.log('1. Go to /dashboard/services');
      console.log('2. Create some services with categories');
      console.log('3. Or manually create categories in the service_categories table');
    }
    
  } catch (err) {
    console.error('❌ Check failed:', err);
  }
}

checkCategories();