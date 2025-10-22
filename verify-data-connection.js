// Verify data connection to current user
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyDataConnection() {
  console.log('🔍 Verifying data connection...\\n');

  try {
    // Get current user session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session.session) {
      console.log('❌ No active session. Please sign in first.');
      return;
    }

    const currentUserId = session.session.user.id;
    const oldUserId = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';
    
    console.log('Current user ID:', currentUserId);
    console.log('Old user ID:', oldUserId);
    console.log('Are they the same?', currentUserId === oldUserId ? '✅ YES' : '❌ NO');
    console.log('');

    if (currentUserId === oldUserId) {
      console.log('🎉 GREAT NEWS! Your user ID is the same!');
      console.log('This means your data is already connected to your account.');
      console.log('No updates needed - everything should be working perfectly.');
      return;
    }

    // Check data connected to current user
    console.log('Checking data connected to current user...');
    
    const { data: currentLeads, error: currentLeadsError } = await supabase
      .from('leads')
      .select('id, name')
      .eq('user_id', currentUserId)
      .limit(5);
    
    const { data: oldLeads, error: oldLeadsError } = await supabase
      .from('leads')
      .select('id, name')
      .eq('user_id', oldUserId)
      .limit(5);

    console.log('\\n📊 Data Summary:');
    console.log('- Leads connected to current user:', currentLeads?.length || 0);
    console.log('- Leads connected to old user:', oldLeads?.length || 0);
    
    if (oldLeads && oldLeads.length > 0 && (!currentLeads || currentLeads.length === 0)) {
      console.log('\\n🔧 Action needed: Update data to point to new user ID');
      console.log('Run the update script to connect your data.');
    } else if (currentLeads && currentLeads.length > 0) {
      console.log('\\n✅ Data is already connected to your current account!');
    } else {
      console.log('\\n⚠️  No data found for either user ID');
    }

  } catch (error) {
    console.log('❌ Verification failed:', error.message);
  }
}

verifyDataConnection();
