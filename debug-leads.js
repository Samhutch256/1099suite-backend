// Debug script to check what leads exist in the database
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from your config
const SUPABASE_URL = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const SUPABASE_ANON_KEY = 'REMOVED_SENSITIVE_DATA';

// The current user ID (from the logs)
const CURRENT_USER_ID = '41a61d89-41a6-41a6-81a6-41a61d8941a6';

async function debugLeads() {
  try {
    console.log('🔍 Debugging leads in database...');
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get ALL leads from the database
    console.log('📊 Fetching ALL leads...');
    const { data: allLeads, error: allError } = await supabase
      .from('leads')
      .select('*');
    
    if (allError) {
      console.error('❌ Error fetching all leads:', allError);
      return;
    }
    
    console.log(`📊 Total leads in database: ${allLeads.length}`);
    
    if (allLeads.length === 0) {
      console.log('❌ No leads found in database at all!');
      return;
    }
    
    // Group leads by user_id
    const leadsByUserId = {};
    allLeads.forEach(lead => {
      const userId = lead.user_id;
      if (!leadsByUserId[userId]) {
        leadsByUserId[userId] = [];
      }
      leadsByUserId[userId].push(lead);
    });
    
    console.log('\n📊 Leads grouped by user_id:');
    Object.keys(leadsByUserId).forEach(userId => {
      console.log(`  User ID: ${userId}`);
      console.log(`  Count: ${leadsByUserId[userId].length}`);
      console.log(`  Sample leads: ${leadsByUserId[userId].slice(0, 3).map(l => l.name).join(', ')}`);
      console.log('');
    });
    
    // Check specifically for current user ID
    console.log(`🔍 Checking for current user ID: ${CURRENT_USER_ID}`);
    const currentUserLeads = leadsByUserId[CURRENT_USER_ID] || [];
    console.log(`📊 Leads for current user: ${currentUserLeads.length}`);
    
    if (currentUserLeads.length > 0) {
      console.log('✅ Current user has leads! The issue might be elsewhere.');
      console.log('Sample leads for current user:');
      currentUserLeads.slice(0, 3).forEach(lead => {
        console.log(`  - ${lead.name} (${lead.status})`);
      });
    } else {
      console.log('❌ Current user has no leads. Need to update user IDs.');
      
      // Find the most common user ID
      const userIds = Object.keys(leadsByUserId);
      if (userIds.length > 0) {
        const mostCommonUserId = userIds[0]; // First one
        console.log(`🔄 Most common user ID: ${mostCommonUserId}`);
        console.log(`📊 This user has ${leadsByUserId[mostCommonUserId].length} leads`);
        
        // Ask if we should update
        console.log('\n💡 To fix this, run the update script with the correct old user ID.');
      }
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
debugLeads(); 