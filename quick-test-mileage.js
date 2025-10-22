const { createClient } = require('@supabase/supabase-js');

// Quick test to see if mileage data exists
async function quickTest() {
  const supabase = createClient(
    'https://bqkmykfooztuhvwwalcu.supabase.co',
    'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"'
  );
  
  try {
    console.log('🔍 Checking mileage_trips table...');
    
    const { data, error } = await supabase
      .from('mileage_trips')
      .select('*')
      .eq('user_id', '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1');
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Found', data.length, 'trips');
      if (data.length > 0) {
        console.log('📋 Trip data:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();
