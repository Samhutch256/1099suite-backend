const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getUserIds() {
  console.log('📋 Fetching user IDs...\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No users found in database');
    return;
  }

  console.log('Users in database:');
  console.log('='.repeat(70));
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email || 'No email'}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   ID: ${user.id}`);
    console.log('');
  });
  console.log('='.repeat(70));
  console.log('\nTo test, run:');
  console.log(`node test-outreach-subinput-fix.js ${users[0].id}`);
}

getUserIds().catch(console.error);

