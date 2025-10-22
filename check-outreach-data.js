const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOutreachData() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('❌ Usage: node check-outreach-data.js <user-id>');
    console.error('   Or run: node get-user-id.js to find your user ID');
    process.exit(1);
  }

  console.log('🔍 Checking outreach data in database...\n');

  // Query directly from daily_inputs table
  const { data, error } = await supabase
    .from('daily_inputs')
    .select('date, doors_knocked, outreach_door_knocks, outreach_tags_put, outreach_calls_made, outreach_referrals, outreach_inbound')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No daily inputs found for this user');
    return;
  }

  console.log('Recent daily inputs (direct query):');
  console.log('='.repeat(100));
  
  data.forEach(row => {
    const subTotal = 
      (row.outreach_door_knocks || 0) + 
      (row.outreach_tags_put || 0) + 
      (row.outreach_calls_made || 0) + 
      (row.outreach_referrals || 0) + 
      (row.outreach_inbound ?? 0);
    
    console.log(`📅 ${row.date}`);
    console.log(`   Total Outreach: ${row.doors_knocked}`);
    console.log(`   Breakdown:`);
    console.log(`     Door Knocks: ${row.outreach_door_knocks || 0}`);
    console.log(`     Tags Put: ${row.outreach_tags_put || 0}`);
    console.log(`     Calls Made: ${row.outreach_calls_made || 0}`);
    console.log(`     Referrals: ${row.outreach_referrals || 0}`);
    const inbound = row.outreach_inbound ?? 0;
    console.log(`     Inbound: ${inbound} ${(row.outreach_inbound === null || row.outreach_inbound === undefined) ? '❌ EMPTY' : '✅'}`);
    console.log(`   Sub-total: ${subTotal} ${subTotal === row.doors_knocked ? '✅ MATCHES' : '⚠️  MISMATCH'}`);
    console.log('');
  });

  console.log('='.repeat(100));
  
  // Now test the aggregation function
  console.log('\n🔄 Testing aggregation function...\n');
  
  const today = new Date().toISOString().split('T')[0];
  const { data: aggData, error: aggError } = await supabase.rpc(
    'daily_inputs_sum_range_with_subinputs',
    {
      p_user: userId,
      p_start: today,
      p_end: today,
    }
  );

  if (aggError) {
    console.error('❌ Aggregation error:', aggError);
    return;
  }

  if (aggData && aggData.length > 0) {
    const result = aggData[0];
    console.log('Aggregation result for today:');
    console.log('='.repeat(100));
    console.log(`   doors_knocked: ${result.doors_knocked}`);
    console.log(`   appointments_set: ${result.appointments_set}`);
    console.log(`   outreach_door_knocks: ${result.outreach_door_knocks}`);
    console.log(`   outreach_tags_put: ${result.outreach_tags_put}`);
    console.log(`   outreach_calls_made: ${result.outreach_calls_made}`);
    console.log(`   outreach_referrals: ${result.outreach_referrals}`);
    console.log(`   outreach_inbound: ${result.outreach_inbound} ${result.outreach_inbound > 0 ? '✅' : '❌'}`);
    console.log('='.repeat(100));
    
    // Check if SQL fix has been applied
    if (result.doors_knocked === undefined || result.doors_knocked === null) {
      console.log('\n⚠️  WARNING: doors_knocked is missing from aggregation result!');
      console.log('   This means the SQL fix has NOT been deployed yet.');
      console.log('\n📋 To fix:');
      console.log('   1. Open Supabase SQL Editor');
      console.log('   2. Run: fix-outreach-subinputs.sql');
      console.log('   3. Run this script again to verify');
    } else if (result.doors_knocked > 0 && result.outreach_inbound > 0) {
      console.log('\n✅ SQL fix appears to be working! Both values are present.');
    } else {
      console.log('\n🔍 Check the direct query results above to see what\'s actually in the database.');
    }
  } else {
    console.log('No data for today');
  }
}

checkOutreachData().catch(console.error);
