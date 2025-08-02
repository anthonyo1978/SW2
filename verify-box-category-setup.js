const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetup() {
  try {
    console.log('🔍 Verifying box-category relationship setup...\n');
    
    // Check if we can access contract_boxes (which means the column exists)
    console.log('1. Checking contract_boxes table access...');
    const { data: testBox, error: columnError } = await supabase
      .from('contract_boxes')
      .select('id, service_category_id')
      .limit(1);
    
    if (columnError) {
      console.error('❌ Error accessing contract_boxes:', columnError);
      return;
    }
    
    console.log('✅ service_category_id column exists and is accessible');
    
    // Check service categories
    console.log('\n2. Checking available service categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('service_categories')
      .select('id, name, color, is_active')
      .eq('is_active', true)
      .limit(5);
    
    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError);
    } else {
      console.log(`✅ Found ${categories.length} active service categories:`);
      categories.forEach(cat => {
        console.log(`   • ${cat.name} (${cat.color})`);
      });
    }
    
    // Check existing contract boxes
    console.log('\n3. Checking existing contract boxes...');
    const { data: boxes, error: boxesError } = await supabase
      .from('contract_boxes')
      .select(`
        id, 
        name, 
        box_type, 
        service_category_id,
        service_categories(name, color)
      `)
      .limit(3);
    
    if (boxesError) {
      console.error('❌ Error fetching boxes:', boxesError);
    } else {
      console.log(`✅ Found ${boxes.length} contract boxes:`);
      boxes.forEach(box => {
        const categoryInfo = box.service_categories 
          ? `→ ${box.service_categories.name}` 
          : '→ No restriction (flexible)';
        console.log(`   • ${box.name} (${box.box_type}) ${categoryInfo}`);
      });
    }
    
    console.log('\n🎉 Setup verification complete!');
    console.log('\nNext steps:');
    console.log('1. Start your dev server: npm run dev');
    console.log('2. Go to /dashboard/contracts/new');
    console.log('3. Test creating a contract with category-restricted boxes');
    
  } catch (err) {
    console.error('❌ Verification failed:', err);
  }
}

verifySetup();