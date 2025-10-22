const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Usage: node get-user-id-simple.js <SUPABASE_URL> <SUPABASE_KEY>');
  console.error('');
  console.error('Example:');
  console.error('  node get-user-id-simple.js https://xxxxx.supabase.co eyJhbGc...');
  console.error('');
  console.error('Get your credentials from:');
  console.error('  Supabase Dashboard > Project Settings > API');
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
  console.log('\nCopy a user ID and use it for the next steps.');
}

getUserIds().catch(console.error);

