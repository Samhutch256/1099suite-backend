const { createClient } = require('@supabase/supabase-js');

// Test your Supabase connection and mileage tables
async function testMileageDatabase() {
  console.log('🧪 Testing Mileage Database Setup...\n');
  
  // You'll need to replace these with your actual Supabase credentials
  const supabaseUrl = 'YOUR_SUPABASE_URL';
  const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
  
  if (supabaseUrl === 'YOUR_SUPABASE_URL') {
    console.log('❌ Please update the Supabase credentials in this file first!');
    console.log('   - Go to your Supabase project dashboard');
    console.log('   - Copy your Project URL and anon key');
    console.log('   - Replace the placeholders in this file');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Check if tables exist
    console.log('1️⃣ Checking if mileage tables exist...');
    
    const { data: trips, error: tripsError } = await supabase
      .from('mileage_trips')
      .select('*')
      .limit(1);
    
    if (tripsError) {
      console.log('❌ mileage_trips table error:', tripsError.message);
    } else {
      console.log('✅ mileage_trips table exists and accessible');
    }
    
    const { data: points, error: pointsError } = await supabase
      .from('mileage_trip_points')
      .select('*')
      .limit(1);
    
    if (pointsError) {
      console.log('❌ mileage_trip_points table error:', pointsError.message);
    } else {
      console.log('✅ mileage_trip_points table exists and accessible');
    }
    
    // Test 2: Check helper functions
    console.log('\n2️⃣ Testing helper functions...');
    
    const { data: rateData, error: rateError } = await supabase
      .rpc('get_irs_rate_cents', { trip_classification: 'business' });
    
    if (rateError) {
      console.log('❌ get_irs_rate_cents function error:', rateError.message);
    } else {
      console.log('✅ get_irs_rate_cents function works:', rateData);
    }
    
    const { data: deductionData, error: deductionError } = await supabase
      .rpc('calculate_mileage_deduction', { 
        trip_miles: 10.5, 
        trip_classification: 'business' 
      });
    
    if (deductionError) {
      console.log('❌ calculate_mileage_deduction function error:', deductionError.message);
    } else {
      console.log('✅ calculate_mileage_deduction function works:', deductionData);
    }
    
    // Test 3: Check RLS policies
    console.log('\n3️⃣ Testing RLS policies...');
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('⚠️  Not authenticated - RLS policies will be tested when you log in');
    } else {
      console.log('✅ User authenticated, RLS policies should work');
    }
    
    console.log('\n🎉 Database setup test completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your app.json with background location permissions');
    console.log('   2. Install required dependencies');
    console.log('   3. Test the mileage tracker in your app');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMileageDatabase();
