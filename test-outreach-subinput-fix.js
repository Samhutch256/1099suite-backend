const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOutreachSubinputFix() {
  console.log('🧪 Testing Outreach Subinput Fix\n');

  const testUserId = process.argv[2];
  if (!testUserId) {
    console.error('❌ Usage: node test-outreach-subinput-fix.js <user-id>');
    process.exit(1);
  }

  console.log(`Testing with user: ${testUserId}\n`);

  const testDate = new Date().toISOString().split('T')[0];

  console.log('Step 1: Insert test data with outreach_inbound = 42');
  const testData = {
    user_id: testUserId,
    date: testDate,
    doors_knocked: 100,
    appointments: 10,
    appointment_holds: 8,
    closed_deals: 3,
    accounts_serviced: 5,
    hours_worked: 8,
    outreach_door_knocks: 30,
    outreach_tags_put: 20,
    outreach_calls_made: 15,
    outreach_referrals: 10,
    outreach_inbound: 42,
    appointments_set_door_knocks: 3,
    appointments_set_tags_put: 2,
    appointments_set_calls_made: 3,
    appointments_set_referrals: 1,
    appointments_set_inbound: 1,
  };

  const { data: insertData, error: insertError } = await supabase
    .from('daily_inputs')
    .upsert(testData, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError);
    return;
  }

  console.log('✅ Inserted:', {
    doors_knocked: insertData.doors_knocked,
    outreach_inbound: insertData.outreach_inbound,
    appointments_set_inbound: insertData.appointments_set_inbound,
  });

  console.log('\nStep 2: Query using aggregation function');
  const startDate = testDate;
  const endDate = testDate;

  const { data: aggData, error: aggError } = await supabase.rpc(
    'daily_inputs_sum_range_with_subinputs',
    {
      p_user: testUserId,
      p_start: startDate,
      p_end: endDate,
    }
  );

  if (aggError) {
    console.error('❌ Aggregation query failed:', aggError);
    return;
  }

  if (!aggData || aggData.length === 0) {
    console.error('❌ No data returned from aggregation function');
    return;
  }

  const result = aggData[0];
  console.log('✅ Aggregation result:', {
    doors_knocked: result.doors_knocked,
    appointments_set: result.appointments_set,
    outreach_inbound: result.outreach_inbound,
    appointments_set_inbound: result.appointments_set_inbound,
  });

  console.log('\nStep 3: Verify column alignment');
  const tests = [
    { name: 'doors_knocked', expected: 100, actual: result.doors_knocked },
    { name: 'appointments_set', expected: 10, actual: result.appointments_set },
    { name: 'outreach_inbound', expected: 42, actual: result.outreach_inbound },
    { name: 'appointments_set_inbound', expected: 1, actual: result.appointments_set_inbound },
  ];

  let allPassed = true;
  for (const test of tests) {
    if (test.expected === test.actual) {
      console.log(`✅ ${test.name}: ${test.actual} (correct)`);
    } else {
      console.log(`❌ ${test.name}: expected ${test.expected}, got ${test.actual}`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Fix is working correctly!');
  } else {
    console.log('❌ TESTS FAILED - SQL function needs to be updated');
    console.log('\nTo fix, run this SQL in Supabase SQL Editor:');
    console.log('  /Users/hutch/Downloads/1099Suite/fix-outreach-subinputs.sql');
  }
  console.log('='.repeat(50));

  console.log('\nStep 4: Cleanup test data');
  const { error: deleteError } = await supabase
    .from('daily_inputs')
    .delete()
    .eq('user_id', testUserId)
    .eq('date', testDate);

  if (deleteError) {
    console.warn('⚠️  Cleanup failed:', deleteError);
  } else {
    console.log('✅ Test data cleaned up');
  }
}

testOutreachSubinputFix().catch(console.error);

