const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  'https://bqkmykfooztuhvwwalcu.supabase.co',
  'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"'
);

async function addMockData() {
  console.log('🚀 Adding mock mileage data...');
  
  const userId = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';
  
  try {
    // First, let's try to add a simple trip
    const { data: trip, error: tripError } = await supabase
      .from('mileage_trips')
      .insert({
        user_id: userId,
        started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        ended_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        start_lat: 39.7392,
        start_lng: -104.9903,
        end_lat: 39.7589,
        end_lng: -104.9730,
        miles: 4.20,
        classification: 'business',
        rate_cents: 67,
        deduction_cents: Math.floor(4.20 * 67),
        notes: 'Mock Denver route for testing'
      })
      .select()
      .single();
    
    if (tripError) {
      console.log('❌ Error adding trip:', tripError.message);
      return;
    }
    
    console.log('✅ Trip added successfully:', trip.id);
    
    // Now add some GPS points
    const points = [];
    for (let i = 0; i < 10; i++) {
      const lat = 39.7392 + (i / 10) * (39.7589 - 39.7392) + (Math.sin(i / 6) / 1000);
      const lng = -104.9903 + (i / 10) * (-104.9730 - (-104.9903)) + (Math.cos(i / 5) / 1000);
      
      points.push({
        trip_id: trip.id,
        t: new Date(Date.now() - 45 * 60 * 1000 + i * 9 * 1000).toISOString(),
        lat: lat,
        lng: lng,
        speed_mps: 12.0,
        accuracy_m: 8.0
      });
    }
    
    const { data: pointsData, error: pointsError } = await supabase
      .from('mileage_trip_points')
      .insert(points);
    
    if (pointsError) {
      console.log('❌ Error adding points:', pointsError.message);
    } else {
      console.log('✅ Points added successfully:', points.length);
    }
    
    console.log('🎉 Mock data added successfully!');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

addMockData();
