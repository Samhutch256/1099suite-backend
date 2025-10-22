import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';

interface AuthErrorHandlerProps {
  children: React.ReactNode;
}

export const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({ children }) => {
  const { error, clearError, signOut } = useAuthStore();

  const handleRetry = () => {
    clearError();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!error) {
    return <>{children}</>;
  }

  // Check if it's a refresh token error
  const isRefreshTokenError = error.includes('session has expired') || 
                             error.includes('refresh token') ||
                             error.includes('Refresh Token Not Found') ||
                             error.includes('Invalid Refresh Token');

  return (
    <View className="flex-1 bg-slate-800 justify-center items-center px-6">
      <View className="bg-red-600/20 border border-red-600 rounded-lg p-6 max-w-sm">
        <View className="items-center mb-4">
          <Ionicons name="warning" size={48} color="#ef4444" />
          <Text className="text-white text-xl font-bold mt-2">
            Authentication Error
          </Text>
        </View>
        
        <Text className="text-gray-300 text-center mb-4">
          {error}
        </Text>
        
        <View className="space-y-3">
          {isRefreshTokenError ? (
            <Pressable
              onPress={handleSignOut}
              className="bg-red-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Sign In Again
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleRetry}
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Try Again
              </Text>
            </Pressable>
          )}
          
          <Pressable
            onPress={clearError}
            className="bg-gray-600 px-4 py-2 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">
              Dismiss
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
