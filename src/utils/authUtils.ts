import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../config/supabase';

/**
 * Clears all authentication data when refresh token errors occur
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    console.log('🧹 Clearing all authentication data...');
    
    // Sign out from Supabase
    try {
      await supabase.auth.signOut();
      console.log('✅ Supabase sign out successful');
    } catch (supabaseError) {
      console.warn('⚠️ Supabase sign out error:', supabaseError);
    }
    
    // Clear SecureStore items
    try {
      await SecureStore.deleteItemAsync('auth_token');
      console.log('✅ SecureStore auth_token cleared');
    } catch (secureError) {
      console.warn('⚠️ SecureStore clear error:', secureError);
    }
    
    // Clear AsyncStorage auth-related items
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('auth') || 
        key.includes('supabase') || 
        key.includes('session') ||
        key.includes('token')
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log(`✅ Cleared ${authKeys.length} auth-related AsyncStorage keys`);
      }
    } catch (asyncError) {
      console.warn('⚠️ AsyncStorage clear error:', asyncError);
    }
    
    console.log('🎉 Authentication data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing authentication data:', error);
    throw error;
  }
};

/**
 * Checks if an error is related to refresh token issues
 */
export const isRefreshTokenError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  return errorMessage.includes('refresh token') || 
         errorMessage.includes('Refresh Token Not Found') ||
         errorMessage.includes('Invalid Refresh Token') ||
         errorMessage.includes('token expired') ||
         errorMessage.includes('session expired');
};

/**
 * Handles refresh token errors by clearing auth data and returning a user-friendly message
 */
export const handleRefreshTokenError = async (error: any): Promise<string> => {
  console.log('🔄 Handling refresh token error:', error);
  
  if (isRefreshTokenError(error)) {
    await clearAuthData();
    return 'Your session has expired. Please sign in again.';
  }
  
  return 'An authentication error occurred. Please try again.';
};

/**
 * Validates if the current session is still valid
 */
export const validateSession = async (): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Session validation error:', error);
      if (isRefreshTokenError(error)) {
        await clearAuthData();
        return { isValid: false, error: 'Your session has expired. Please sign in again.' };
      }
      return { isValid: false, error: 'Session validation failed.' };
    }
    
    if (!session || !session.user) {
      return { isValid: false, error: 'No valid session found.' };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('❌ Session validation failed:', error);
    if (isRefreshTokenError(error)) {
      await clearAuthData();
      return { isValid: false, error: 'Your session has expired. Please sign in again.' };
    }
    return { isValid: false, error: 'Session validation failed.' };
  }
};
