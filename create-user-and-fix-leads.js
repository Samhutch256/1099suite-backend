// Script to create user and fix the leads user ID
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from your config
const SUPABASE_URL = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const SUPABASE_ANON_KEY = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

// The current user ID (from the logs)
const CURRENT_USER_ID = '41a61d89-41a6-41a6-81a6-41a61d8941a6';

// The old user ID (from the database)
const OLD_USER_ID = '1efa846a-b408-4196-84bd-e93e2c7d9e9b';

async function createUserAndFixLeads() {
  try {
    console.log('🔧 Starting user creation and leads fix...');
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // First, check if the user already exists
    console.log('🔍 Checking if user exists...');
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', CURRENT_USER_ID)
      .single();
    
    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking user:', userError);
      return;
    }
    
    if (existingUser) {
      console.log('✅ User already exists');
    } else {
      console.log('📝 Creating user...');
      
      // Create the user record
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: CURRENT_USER_ID,
          email: 'samhutch256@gmail.com', // From your logs
          name: 'Sam Hutch', // From your logs
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating user:', createError);
        return;
      }
      
      console.log('✅ User created successfully');
    }
    
    // Now update the leads to use the current user ID
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
    console.log('🎉 User creation and leads fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
createUserAndFixLeads(); 