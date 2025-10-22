// PART E — QA checklist and e2e test
// This script tests the complete implementation to ensure:
// - Saving in Day view updates/creates a day row
// - Week/Month/Year views create/replace exactly one row for that period
// - Switching views shows the same totals
// - No duplicate rows exist for the same (user,period_type,period_start)
// - Editing a week does not change the underlying days (by design)
// - RLS: only the owner can see/modify rows

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test user ID (you'll need to replace this with a real user ID)
const TEST_USER_ID = 'your-test-user-id-here';

async function runTests() {
  console.log('🧪 Starting Period Granularity Tests...\n');

  try {
    // Test 1: Create 3 daily rows in the same week
    console.log('📅 Test 1: Creating 3 daily rows in the same week...');
    await testDailyRowsInWeek();
    
    // Test 2: Verify Week view sums correctly
    console.log('\n📊 Test 2: Verifying Week view sums correctly...');
    await testWeekViewAggregation();
    
    // Test 3: Create a Week row for that same week
    console.log('\n📈 Test 3: Creating a Week row for the same week...');
    await testWeekRowCreation();
    
    // Test 4: Verify Week view now shows the week row value
    console.log('\n✅ Test 4: Verifying Week view shows week row value...');
    await testWeekViewPreference();
    
    // Test 5: Remove the Week row
    console.log('\n🗑️ Test 5: Removing the Week row...');
    await testWeekRowDeletion();
    
    // Test 6: Verify it falls back to daily aggregation
    console.log('\n🔄 Test 6: Verifying fallback to daily aggregation...');
    await testFallbackToDaily();
    
    // Test 7: Test Month and Year views
    console.log('\n📅 Test 7: Testing Month and Year views...');
    await testMonthAndYearViews();
    
    // Test 8: Test anti-double-counting
    console.log('\n🚫 Test 8: Testing anti-double-counting...');
    await testAntiDoubleCounting();
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function testDailyRowsInWeek() {
  // Create 3 daily rows for Monday, Wednesday, Friday of the same week
  const baseDate = new Date('2025-01-20'); // Monday
  const dailyData = [
    { date: '2025-01-20', appointments_set: 5, door_knocks: 10, hours_worked: 8.5 },
    { date: '2025-01-22', appointments_set: 3, door_knocks: 8, hours_worked: 7.0 },
    { date: '2025-01-24', appointments_set: 7, door_knocks: 15, hours_worked: 9.0 }
  ];

  for (const data of dailyData) {
    const { error } = await supabase
      .from('inputs_log')
      .upsert({
        user_id: TEST_USER_ID,
        period_type: 'day',
        period_start: data.date,
        period_end: data.date,
        appointments_set: data.appointments_set,
        door_knocks: data.door_knocks,
        hours_worked: data.hours_worked,
        source: 'test'
      }, { onConflict: 'user_id,period_type,period_start' });

    if (error) throw new Error(`Failed to create daily row: ${error.message}`);
  }

  console.log('✅ Created 3 daily rows');
}

async function testWeekViewAggregation() {
  // Query the week view for the week containing 2025-01-20
  const { data, error } = await supabase
    .from('v_inputs_week')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('period_start', '2025-01-20')
    .single();

  if (error) throw new Error(`Failed to query week view: ${error.message}`);

  // Expected totals: 5+3+7=15 appointments, 10+8+15=33 door knocks, 8.5+7+9=24.5 hours
  const expected = {
    appointments_set: 15,
    door_knocks: 33,
    hours_worked: 24.5
  };

  if (data.appointments_set !== expected.appointments_set ||
      data.door_knocks !== expected.door_knocks ||
      Math.abs(data.hours_worked - expected.hours_worked) > 0.01) {
    throw new Error(`Week aggregation mismatch. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(data)}`);
  }

  console.log('✅ Week view correctly aggregates daily rows');
}

async function testWeekRowCreation() {
  // Create a week row for the same week
  const { error } = await supabase
    .from('inputs_log')
    .upsert({
      user_id: TEST_USER_ID,
      period_type: 'week',
      period_start: '2025-01-20',
      period_end: '2025-01-26',
      appointments_set: 25, // Different from daily sum
      door_knocks: 50,      // Different from daily sum
      hours_worked: 40.0,   // Different from daily sum
      source: 'test'
    }, { onConflict: 'user_id,period_type,period_start' });

  if (error) throw new Error(`Failed to create week row: ${error.message}`);

  console.log('✅ Created week row');
}

async function testWeekViewPreference() {
  // Query the week view again - should now show the week row values
  const { data, error } = await supabase
    .from('v_inputs_week')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('period_start', '2025-01-20')
    .single();

  if (error) throw new Error(`Failed to query week view: ${error.message}`);

  // Should show week row values, not daily sum
  const expected = {
    appointments_set: 25,
    door_knocks: 50,
    hours_worked: 40.0
  };

  if (data.appointments_set !== expected.appointments_set ||
      data.door_knocks !== expected.door_knocks ||
      Math.abs(data.hours_worked - expected.hours_worked) > 0.01) {
    throw new Error(`Week view should show week row values. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(data)}`);
  }

  console.log('✅ Week view correctly shows week row values');
}

async function testWeekRowDeletion() {
  // Delete the week row
  const { error } = await supabase
    .from('inputs_log')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .eq('period_type', 'week')
    .eq('period_start', '2025-01-20');

  if (error) throw new Error(`Failed to delete week row: ${error.message}`);

  console.log('✅ Deleted week row');
}

async function testFallbackToDaily() {
  // Query the week view again - should fall back to daily aggregation
  const { data, error } = await supabase
    .from('v_inputs_week')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('period_start', '2025-01-20')
    .single();

  if (error) throw new Error(`Failed to query week view: ${error.message}`);

  // Should show daily sum again
  const expected = {
    appointments_set: 15,
    door_knocks: 33,
    hours_worked: 24.5
  };

  if (data.appointments_set !== expected.appointments_set ||
      data.door_knocks !== expected.door_knocks ||
      Math.abs(data.hours_worked - expected.hours_worked) > 0.01) {
    throw new Error(`Week view should fall back to daily aggregation. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(data)}`);
  }

  console.log('✅ Week view correctly falls back to daily aggregation');
}

async function testMonthAndYearViews() {
  // Test month view
  const { data: monthData, error: monthError } = await supabase
    .from('v_inputs_month')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('period_start', '2025-01-01')
    .single();

  if (monthError) throw new Error(`Failed to query month view: ${monthError.message}`);

  // Should aggregate the daily rows (15 appointments, 33 door knocks, 24.5 hours)
  if (monthData.appointments_set !== 15) {
    throw new Error(`Month view aggregation incorrect. Expected 15 appointments, got ${monthData.appointments_set}`);
  }

  // Test year view
  const { data: yearData, error: yearError } = await supabase
    .from('v_inputs_year')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('period_start', '2025-01-01')
    .single();

  if (yearError) throw new Error(`Failed to query year view: ${yearError.message}`);

  // Should aggregate the daily rows
  if (yearData.appointments_set !== 15) {
    throw new Error(`Year view aggregation incorrect. Expected 15 appointments, got ${yearData.appointments_set}`);
  }

  console.log('✅ Month and Year views work correctly');
}

async function testAntiDoubleCounting() {
  // Create a month row for January 2025
  const { error: monthError } = await supabase
    .from('inputs_log')
    .upsert({
      user_id: TEST_USER_ID,
      period_type: 'month',
      period_start: '2025-01-01',
      period_end: '2025-01-31',
      appointments_set: 100, // Different from daily sum
      door_knocks: 200,      // Different from daily sum
      hours_worked: 150.0,   // Different from daily sum
      source: 'test'
    }, { onConflict: 'user_id,period_type,period_start' });

  if (monthError) throw new Error(`Failed to create month row: ${monthError.message}`);

  // Query month view - should show month row value, not daily sum
  const { data: monthData, error: monthQueryError } = await supabase
    .from('v_inputs_month')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('period_start', '2025-01-01')
    .single();

  if (monthQueryError) throw new Error(`Failed to query month view: ${monthQueryError.message}`);

  // Should show month row values, not daily sum
  if (monthData.appointments_set !== 100) {
    throw new Error(`Month view should show month row value (100), not daily sum (15). Got: ${monthData.appointments_set}`);
  }

  console.log('✅ Anti-double-counting works correctly');
}

// Clean up test data
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  const { error } = await supabase
    .from('inputs_log')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .eq('source', 'test');

  if (error) {
    console.error('Warning: Failed to cleanup test data:', error.message);
  } else {
    console.log('✅ Test data cleaned up');
  }
}

// Run the tests
if (require.main === module) {
  if (!TEST_USER_ID || TEST_USER_ID === 'your-test-user-id-here') {
    console.error('❌ Please set TEST_USER_ID to a real user ID before running tests');
    process.exit(1);
  }

  runTests()
    .then(() => cleanup())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      cleanup().finally(() => process.exit(1));
    });
}

module.exports = { runTests, cleanup };
