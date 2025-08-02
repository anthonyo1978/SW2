const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
  try {
    console.log('Adding service_category_id column to contract_boxes...');
    
    // First check if column already exists
    const { data: existingColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'contract_boxes')
      .eq('column_name', 'service_category_id');
    
    if (existingColumns && existingColumns.length > 0) {
      console.log('✅ Column already exists');
      return;
    }
    
    // Use raw SQL through a simple select to test connection
    const { data, error } = await supabase
      .from('contract_boxes')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      return;
    }
    
    console.log('✅ Database connection working');
    console.log('⚠️  Manual SQL execution needed:');
    console.log('\nPlease run this SQL in your Supabase SQL Editor:');
    console.log('\n-- Add service category relationship to contract boxes');
    console.log('ALTER TABLE contract_boxes ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;');
    console.log('\n-- Create index');
    console.log('CREATE INDEX IF NOT EXISTS idx_contract_boxes_service_category_id ON contract_boxes(service_category_id);');
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

addColumn();