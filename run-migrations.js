#!/usr/bin/env node

// Simple script to run database migrations
// This connects to your Supabase database and runs the required SQL

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(filePath) {
  try {
    console.log(`📄 Running migration: ${path.basename(filePath)}`)
    
    const sql = fs.readFileSync(filePath, 'utf8')
    
    // Split SQL into individual statements (rough approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT')
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          console.error(`❌ Error executing statement: ${error.message}`)
          console.error(`Statement: ${statement.substring(0, 100)}...`)
        }
      }
    }
    
    console.log(`✅ Migration completed: ${path.basename(filePath)}`)
  } catch (error) {
    console.error(`❌ Error running migration ${filePath}:`, error.message)
  }
}

async function main() {
  console.log('🚀 Starting database migrations...')
  
  // Check if basic services table exists
  const { data, error } = await supabase
    .from('services')
    .select('id')
    .limit(1)
  
  if (error && error.message.includes('relation "services" does not exist')) {
    console.log('📋 Services table does not exist. Running basic table creation...')
    await runMigration('scripts/64-create-basic-services-table.sql')
  } else if (!error) {
    console.log('✅ Services table already exists')
  } else {
    console.error('❌ Error checking services table:', error.message)
  }
  
  console.log('🏁 Migration process completed')
  console.log('💡 You can now try creating a service in your application')
}

main().catch(console.error)