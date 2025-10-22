const { createClient } = require('@supabase/supabase-js');

// Add mock mileage data for testing
async function addMockMileageData() {
  console.log('🚗 Adding Mock Mileage Data...\n');
  
  // You'll need to replace these with your actual Supabase credentials
  const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
  const supabaseKey = 'REMOVED_SENSITIVE_DATA';
  
  if (supabaseUrl === 'YOUR_SUPABASE_URL') {
    console.log('❌ Please update the Supabase credentials in this file first!');
    console.log('   - Go to your Supabase project dashboard');
    console.log('   - Copy your Project URL and anon key');
    console.log('   - Replace the placeholders in this file');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ You need to be logged in to add mock data');
      console.log('   - Make sure you\'re authenticated in your app first');
      return;
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Mock trip data
    const mockTrips = [
      {
        user_id: user.id,
        started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        ended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 30 min later
        start_lat: 37.7749,
        start_lng: -122.4194,
        end_lat: 37.7849,
        end_lng: -122.4094,
        miles: 5.2,
        classification: 'business',
        rate_cents: 67,
        deduction_cents: 348, // 5.2 * 67
        notes: 'Client meeting in downtown SF'
      },
      {
        user_id: user.id,
        started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        ended_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), // 45 min later
        start_lat: 37.7849,
        start_lng: -122.4094,
        end_lat: 37.7949,
        end_lng: -122.3994,
        miles: 8.7,
        classification: 'medical',
        rate_cents: 21,
        deduction_cents: 183, // 8.7 * 21
        notes: 'Doctor appointment'
      },
      {
        user_id: user.id,
        started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        ended_at: new Date(Date.now() - 6 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(), // 20 min later
        start_lat: 37.7949,
        start_lng: -122.3994,
        end_lat: 37.8049,
        end_lng: -122.3894,
        miles: 3.1,
        classification: 'charity',
        rate_cents: 14,
        deduction_cents: 43, // 3.1 * 14
        notes: 'Volunteer work at food bank'
      }
    ];
    
    console.log('📝 Inserting mock trips...');
    
    for (const trip of mockTrips) {
      const { data, error } = await supabase
        .from('mileage_trips')
        .insert([trip])
        .select();
      
      if (error) {
        console.log('❌ Error inserting trip:', error.message);
      } else {
        console.log('✅ Inserted trip:', data[0].id, '-', trip.miles, 'miles,', trip.classification);
      }
    }
    
    console.log('\n🎉 Mock mileage data added successfully!');
    console.log('\n📱 Now you can:');
    console.log('   1. Open your app');
    console.log('   2. Go to the Mileage tab');
    console.log('   3. See the mock trips in your list');
    console.log('   4. Test swipe gestures and trip details');
    
  } catch (error) {
    console.error('❌ Error adding mock data:', error.message);
  }
}

addMockMileageData();
