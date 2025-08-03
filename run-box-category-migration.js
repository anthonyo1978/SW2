const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const sql = fs.readFileSync('./scripts/65-add-contract-box-service-category-relationship.sql', 'utf8');
    console.log('Running migration to add service category relationship...');
    
    // Split the SQL into individual statements and execute them
    const statements = sql.split(/;\s*\n/).filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing statement...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        if (error) {
          console.error('Migration error:', error);
          console.error('Failed statement:', statement.substring(0, 100) + '...');
          return;
        }
      }
    }
    
    console.log('✅ Migration completed successfully');
    console.log('Database changes applied:');
    console.log('- Added service_category_id column to contract_boxes table');
    console.log('- Created prevention trigger for category deletion');
    console.log('- Added helper functions for service validation');
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

runMigration();