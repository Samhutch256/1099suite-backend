const { createClient } = require('@supabase/supabase-js');

// Add comprehensive mock mileage data with GPS points for map testing
async function addMockMileageWithGPS() {
  console.log('🗺️ Adding Mock Mileage Data with GPS Points...\n');
  
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
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ You need to be logged in to add mock data');
      console.log('   - Make sure you\'re authenticated in your app first');
      return;
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Generate realistic GPS route points
    function generateRoutePoints(startLat, startLng, endLat, endLng, durationMinutes = 30) {
      const points = [];
      const numPoints = Math.max(10, durationMinutes * 2); // 2 points per minute
      
      for (let i = 0; i <= numPoints; i++) {
        const progress = i / numPoints;
        const lat = startLat + (endLat - startLat) * progress + (Math.random() - 0.5) * 0.001; // Add some noise
        const lng = startLng + (endLng - startLng) * progress + (Math.random() - 0.5) * 0.001;
        
        points.push({
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          speed_mps: Math.random() * 15 + 5, // 5-20 m/s (11-45 mph)
          accuracy_m: Math.random() * 5 + 3 // 3-8 meter accuracy
        });
      }
      
      return points;
    }
    
    // Mock trip data with realistic routes
    const mockTrips = [
      {
        user_id: user.id,
        started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        ended_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), // 45 min later
        start_lat: 37.7749, // San Francisco
        start_lng: -122.4194,
        end_lat: 37.7849,
        end_lng: -122.4094,
        miles: 8.2,
        classification: 'business',
        rate_cents: 67,
        deduction_cents: 549, // 8.2 * 67
        notes: 'Client meeting in downtown SF - took scenic route along the bay'
      },
      {
        user_id: user.id,
        started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        ended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(), // 25 min later
        start_lat: 37.7849,
        start_lng: -122.4094,
        end_lat: 37.7949,
        end_lng: -122.3994,
        miles: 5.7,
        classification: 'medical',
        rate_cents: 21,
        deduction_cents: 120, // 5.7 * 21
        notes: 'Doctor appointment - traffic was heavy on the way back'
      },
      {
        user_id: user.id,
        started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        ended_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000).toISOString(), // 35 min later
        start_lat: 37.7949,
        start_lng: -122.3994,
        end_lat: 37.8049,
        end_lng: -122.3894,
        miles: 12.4,
        classification: 'charity',
        rate_cents: 14,
        deduction_cents: 174, // 12.4 * 14
        notes: 'Volunteer work at food bank - long drive but worth it'
      },
      {
        user_id: user.id,
        started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        ended_at: new Date(Date.now() - 6 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(), // 20 min later
        start_lat: 37.8049,
        start_lng: -122.3894,
        end_lat: 37.8149,
        end_lng: -122.3794,
        miles: 3.8,
        classification: 'personal',
        rate_cents: 0,
        deduction_cents: 0,
        notes: 'Grocery shopping trip'
      }
    ];
    
    console.log('📝 Inserting mock trips with GPS points...');
    
    for (let i = 0; i < mockTrips.length; i++) {
      const trip = mockTrips[i];
      
      // Insert the trip
      const { data: tripData, error: tripError } = await supabase
        .from('mileage_trips')
        .insert([trip])
        .select();
      
      if (tripError) {
        console.log('❌ Error inserting trip:', tripError.message);
        continue;
      }
      
      const tripId = tripData[0].id;
      console.log('✅ Inserted trip:', tripId, '-', trip.miles, 'miles,', trip.classification);
      
      // Generate GPS points for this trip
      const routePoints = generateRoutePoints(
        trip.start_lat, trip.start_lng, 
        trip.end_lat, trip.end_lng,
        Math.floor((new Date(trip.ended_at) - new Date(trip.started_at)) / 60000) // duration in minutes
      );
      
      // Insert GPS points
      const gpsPoints = routePoints.map((point, index) => {
        const timestamp = new Date(trip.started_at);
        timestamp.setMinutes(timestamp.getMinutes() + (index * 2)); // 2 minutes between points
        
        return {
          trip_id: tripId,
          t: timestamp.toISOString(),
          lat: point.lat,
          lng: point.lng,
          speed_mps: point.speed_mps,
          accuracy_m: point.accuracy_m
        };
      });
      
      const { error: pointsError } = await supabase
        .from('mileage_trip_points')
        .insert(gpsPoints);
      
      if (pointsError) {
        console.log('❌ Error inserting GPS points for trip', tripId, ':', pointsError.message);
      } else {
        console.log('✅ Inserted', gpsPoints.length, 'GPS points for trip', tripId);
      }
    }
    
    console.log('\n🎉 Mock mileage data with GPS points added successfully!');
    console.log('\n📱 Now you can:');
    console.log('   1. Open your app');
    console.log('   2. Go to the Mileage tab');
    console.log('   3. Tap on any trip to see the GPS route on the map');
    console.log('   4. Test the map functionality and trip details');
    
  } catch (error) {
    console.error('❌ Error adding mock data:', error.message);
  }
}

addMockMileageWithGPS();
