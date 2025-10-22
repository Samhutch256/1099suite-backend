const { createClient } = require('@supabase/supabase-js');

// Test script to check if mileage data is accessible
async function testMileageData() {
  console.log('🧪 Testing Mileage Data Access...\n');
  
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
    // Test 1: Check if we can access mileage_trips table
    console.log('1️⃣ Checking mileage_trips table...');
    
    const { data: trips, error: tripsError } = await supabase
      .from('mileage_trips')
      .select('*')
      .limit(5);
    
    if (tripsError) {
      console.log('❌ Error accessing mileage_trips:', tripsError.message);
    } else {
      console.log('✅ Found', trips.length, 'trips in mileage_trips table');
      if (trips.length > 0) {
        console.log('📋 Sample trip:', {
          id: trips[0].id,
          user_id: trips[0].user_id,
          classification: trips[0].classification,
          miles: trips[0].miles,
          notes: trips[0].notes
        });
      }
    }
    
    // Test 2: Check if we can access mileage_trip_points table
    console.log('\n2️⃣ Checking mileage_trip_points table...');
    
    const { data: points, error: pointsError } = await supabase
      .from('mileage_trip_points')
      .select('*')
      .limit(5);
    
    if (pointsError) {
      console.log('❌ Error accessing mileage_trip_points:', pointsError.message);
    } else {
      console.log('✅ Found', points.length, 'points in mileage_trip_points table');
      if (points.length > 0) {
        console.log('📋 Sample point:', {
          id: points[0].id,
          trip_id: points[0].trip_id,
          lat: points[0].lat,
          lng: points[0].lng
        });
      }
    }
    
    // Test 3: Check specific user's trips
    console.log('\n3️⃣ Checking trips for your user ID...');
    
    const { data: userTrips, error: userTripsError } = await supabase
      .from('mileage_trips')
      .select('*')
      .eq('user_id', '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1')
      .order('started_at', { ascending: false });
    
    if (userTripsError) {
      console.log('❌ Error accessing user trips:', userTripsError.message);
    } else {
      console.log('✅ Found', userTrips.length, 'trips for your user ID');
      if (userTrips.length > 0) {
        console.log('📋 Your trips:');
        userTrips.forEach((trip, index) => {
          console.log(`   ${index + 1}. ${trip.classification} trip - ${trip.miles} miles - ${trip.notes}`);
        });
      }
    }
    
    console.log('\n🎉 Mileage data test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMileageData();
