// Script to fix the user ID mismatch in the leads table
// This script updates all leads to use the current user's ID

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from your config
const SUPABASE_URL = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const SUPABASE_ANON_KEY = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

// The current user ID (from the logs)
const CURRENT_USER_ID = '41a61d89-41a6-41a6-81a6-41a61d8941a6';

// The old user ID (from the database)
const OLD_USER_ID = '1efa846a-b408-4196-84bd-e93e2c7d9e9b';

async function fixLeadsUserId() {
  try {
    console.log('🔧 Starting leads user ID fix...');
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // First, let's check what leads exist with the old user ID
    console.log('📊 Checking leads with old user ID...');
    const { data: oldLeads, error: oldError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', OLD_USER_ID);
    
    if (oldError) {
      console.error('❌ Error fetching old leads:', oldError);
      return;
    }
    
    console.log(`📊 Found ${oldLeads.length} leads with old user ID`);
    
    if (oldLeads.length === 0) {
      console.log('✅ No leads found with old user ID. Nothing to fix.');
      return;
    }
    
    // Now let's check if there are any leads with the current user ID
    console.log('📊 Checking leads with current user ID...');
    const { data: currentLeads, error: currentError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', CURRENT_USER_ID);
    
    if (currentError) {
      console.error('❌ Error fetching current leads:', currentError);
      return;
    }
    
    console.log(`📊 Found ${currentLeads.length} leads with current user ID`);
    
    // Update all leads to use the current user ID
    console.log('🔄 Updating leads to use current user ID...');
    const { data: updateData, error: updateError } = await supabase
      .from('leads')
      .update({ user_id: CURRENT_USER_ID })
      .eq('user_id', OLD_USER_ID);
    
    if (updateError) {
      console.error('❌ Error updating leads:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated leads user ID!');
    
    // Verify the update worked
    console.log('🔍 Verifying update...');
    const { data: verifyLeads, error: verifyError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', CURRENT_USER_ID);
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log(`✅ Verification complete: ${verifyLeads.length} leads now belong to current user`);
    console.log('🎉 Leads user ID fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
fixLeadsUserId(); 