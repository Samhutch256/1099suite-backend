// Script to add the lead_input_tallies table to Supabase
// This table is needed for the Tally workflow feature

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTalliesTable() {
  console.log('🔧 Adding lead_input_tallies table to Supabase...\n');
  
  try {
    // First, check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('lead_input_tallies')
      .select('*')
      .limit(1);
    
    if (checkError && checkError.code === '42P01') {
      console.log('❌ Table does not exist. You need to run the migration manually.');
      console.log('\n📝 To fix this, please:');
      console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to your project: https://bqkmykfooztuhvwwalcu.supabase.co');
      console.log('3. Go to the SQL Editor');
      console.log('4. Copy and paste the contents of add-lead-input-tallies-migration.sql');
      console.log('5. Run the SQL to create the table');
      console.log('\n🔗 Migration file: add-lead-input-tallies-migration.sql');
      
      return false;
    } else if (checkError) {
      console.log('❌ Error checking table:', checkError.message);
      return false;
    } else {
      console.log('✅ Table already exists!');
      return true;
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\n📝 You need to manually run the migration in Supabase SQL Editor.');
    console.log('🔗 Migration file: add-lead-input-tallies-migration.sql');
    return false;
  }
}

async function main() {
  console.log('🚀 Checking and adding lead_input_tallies table...\n');
  
  const success = await addTalliesTable();
  
  if (success) {
    console.log('\n🎉 Tally table is ready! The Tally feature should now work.');
  } else {
    console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor.');
  }
  
  console.log('\n🏁 Script complete!');
}

main().catch(console.error);
