// Script to check what the actual authenticated user ID should be
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from your config
const SUPABASE_URL = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const SUPABASE_ANON_KEY = 'REMOVED_SENSITIVE_DATA';

async function checkAuthUser() {
  try {
    console.log('🔍 Checking authenticated users...');
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check what users exist in the public.users table
    console.log('📊 Checking public.users table...');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*');
    
    if (publicError) {
      console.error('❌ Error fetching public users:', publicError);
      return;
    }
    
    console.log(`📊 Found ${publicUsers.length} users in public.users table:`);
    publicUsers.forEach(user => {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Name: ${user.name}`);
      console.log('');
    });
    
    // Check what leads exist and their user IDs
    console.log('📊 Checking leads table...');
    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('user_id, name');
    
    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      return;
    }
    
    console.log(`📊 Found ${allLeads.length} leads:`);
    const leadsByUserId = {};
    allLeads.forEach(lead => {
      if (!leadsByUserId[lead.user_id]) {
        leadsByUserId[lead.user_id] = [];
      }
      leadsByUserId[lead.user_id].push(lead.name);
    });
    
    Object.keys(leadsByUserId).forEach(userId => {
      console.log(`  User ID: ${userId}`);
      console.log(`  Lead count: ${leadsByUserId[userId].length}`);
      console.log(`  Sample leads: ${leadsByUserId[userId].slice(0, 3).join(', ')}`);
      console.log('');
    });
    
    // Check if any of the lead user IDs match the public users
    console.log('🔍 Checking for matches...');
    const publicUserIds = publicUsers.map(u => u.id);
    const leadUserIds = Object.keys(leadsByUserId);
    
    const matchingIds = leadUserIds.filter(leadId => publicUserIds.includes(leadId));
    const nonMatchingIds = leadUserIds.filter(leadId => !publicUserIds.includes(leadId));
    
    console.log(`✅ Matching user IDs: ${matchingIds.length}`);
    matchingIds.forEach(id => console.log(`  - ${id}`));
    
    console.log(`❌ Non-matching user IDs: ${nonMatchingIds.length}`);
    nonMatchingIds.forEach(id => console.log(`  - ${id}`));
    
    if (matchingIds.length > 0) {
      console.log('\n💡 Solution: Update the app to use one of the matching user IDs');
      console.log(`   Recommended user ID: ${matchingIds[0]}`);
    } else {
      console.log('\n💡 Solution: Update the leads to use one of the existing user IDs');
      console.log(`   Recommended user ID: ${publicUserIds[0]}`);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
checkAuthUser(); 