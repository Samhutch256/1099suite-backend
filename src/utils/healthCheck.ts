import { supabase } from '../config/supabase';

export async function performHealthCheck() {
  console.log('🔍 Starting Supabase health check...');
  
  try {
    // Check if we can connect to Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 Auth check:', { user: user?.id, error: authError });
    
    if (user) {
      // Try to access the users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("count")
        .eq("id", user.id);
      
      console.log('🔍 Users table access:', { userData, userError });
      
      // Try to get the full user row
      const { data: fullUserData, error: fullUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      
      console.log('🔍 Full user data:', { fullUserData, fullUserError });
      
      return {
        success: true,
        auth: { user: user.id, error: authError },
        usersTable: { data: userData, error: userError },
        fullUser: { data: fullUserData, error: fullUserError }
      };
    } else {
      console.log('🔍 No authenticated user found');
      return {
        success: false,
        auth: { user: null, error: authError },
        message: 'No authenticated user'
      };
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
