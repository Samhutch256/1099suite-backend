const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleTrips() {
  console.log('🚀 Adding sample mileage trips...');

  const userId = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

  try {
    // Sample trips data
    const sampleTrips = [
      {
        user_id: userId,
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        ended_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours ago
        start_lat: 39.7392,
        start_lng: -104.9903,
        end_lat: 39.7589,
        end_lng: -104.9730,
        miles: 4.2,
        classification: 'business',
        rate_cents: 67,
        deduction_cents: 281, // 4.2 * 67
        notes: 'Client meeting in downtown Denver'
      },
      {
        user_id: userId,
        started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        ended_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), // 3.5 hours ago
        start_lat: 39.7392,
        start_lng: -104.9903,
        end_lat: 39.7500,
        end_lng: -104.9800,
        miles: 2.1,
        classification: 'medical',
        rate_cents: 21,
        deduction_cents: 44, // 2.1 * 21
        notes: 'Doctor appointment'
      },
      {
        user_id: userId,
        started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        ended_at: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(), // 5.5 hours ago
        start_lat: 39.7392,
        start_lng: -104.9903,
        end_lat: 39.7200,
        end_lng: -105.0000,
        miles: 3.8,
        classification: 'charity',
        rate_cents: 14,
        deduction_cents: 53, // 3.8 * 14
        notes: 'Volunteer work at food bank'
      }
    ];

    // Insert trips
    const { data: tripsData, error: tripsError } = await supabase
      .from('mileage_trips')
      .insert(sampleTrips)
      .select('id');

    if (tripsError) {
      console.log('❌ Error inserting trips:', tripsError.message);
      return;
    }

    console.log('✅ Successfully inserted', tripsData.length, 'sample trips');

    // Add some GPS points for the first trip (business trip)
    if (tripsData.length > 0) {
      const firstTripId = tripsData[0].id;
      const points = [];
      
      // Generate ~20 GPS points along the route
      for (let i = 0; i < 20; i++) {
        const timeOffset = i * 2 * 60 * 1000; // 2 minutes apart
        const progress = i / 19; // 0 to 1
        
        points.push({
          trip_id: firstTripId,
          t: new Date(Date.now() - 2 * 60 * 60 * 1000 + timeOffset).toISOString(),
          lat: 39.7392 + progress * (39.7589 - 39.7392) + (Math.sin(i / 3.0) / 1000.0),
          lng: -104.9903 + progress * (-104.9730 - (-104.9903)) + (Math.cos(i / 2.0) / 1000.0),
          speed_mps: 12.0,
          accuracy_m: 8.0
        });
      }

      const { error: pointsError } = await supabase
        .from('mileage_trip_points')
        .insert(points);

      if (pointsError) {
        console.log('❌ Error inserting GPS points:', pointsError.message);
      } else {
        console.log('✅ Successfully inserted', points.length, 'GPS points for the business trip');
      }
    }

    // Verify the data
    const { data: verifyData, error: verifyError } = await supabase
      .from('mileage_trips')
      .select('*')
      .eq('user_id', userId);

    if (verifyError) {
      console.log('❌ Verification error:', verifyError.message);
    } else {
      console.log('✅ Verification: Found', verifyData.length, 'trips in database');
      console.log('📋 Trip details:');
      verifyData.forEach((trip, index) => {
        console.log(`   ${index + 1}. ${trip.classification} trip: ${trip.miles} miles, $${(trip.deduction_cents / 100).toFixed(2)} deduction`);
      });
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

addSampleTrips();
