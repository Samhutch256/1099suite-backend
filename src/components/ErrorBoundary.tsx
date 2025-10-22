import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void; clearAllData: () => Promise<void> }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    // Check if this is a navigation context error
    if (error.message.includes('navigation context') || error.message.includes('NavigationContainer')) {
      console.error('🚨 Navigation context error detected:', error.message);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  clearAllData = async () => {
    try {
      console.log('🧹 Clearing all app data...');
      
      // Clear AsyncStorage
      await AsyncStorage.clear();
      console.log('✅ AsyncStorage cleared');
      
      // Clear SecureStore keys
      try {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('mock_users');
      } catch (secureError) {
        console.warn('⚠️ SecureStore clear error:', secureError);
      }
      console.log('✅ SecureStore cleared');
      
      // Delete database
      try {
        await SQLite.deleteDatabaseAsync('trackingApp.db');
        console.log('✅ Database deleted');
      } catch (dbError) {
        console.warn('⚠️ Database delete error:', dbError);
      }
      
      console.log('🎉 All data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            resetError={this.resetError}
            clearAllData={this.clearAllData}
          />
        );
      }

      return (
        <SafeAreaView className="flex-1 bg-slate-800">
          <View className="flex-1 items-center justify-center px-6">
            <View className="mb-8 items-center">
              <Ionicons name="warning" size={64} color="#ef4444" className="mb-4" />
              <Text className="text-2xl font-bold text-white mb-2 text-center">
                Oops! Something went wrong
              </Text>
              <Text className="text-slate-300 text-center mb-4">
                The app encountered an unexpected error during initialization.
              </Text>
              
              {this.state.error && (
                <View className="bg-slate-700 p-4 rounded-lg mb-6 max-w-full">
                  <Text className="text-red-400 text-sm font-mono">
                    {this.state.error.message}
                  </Text>
                </View>
              )}
            </View>
            
            <View className="space-y-4 w-full max-w-sm">
              <Pressable
                onPress={this.resetError}
                className="bg-orange-500 py-4 px-6 rounded-lg active:bg-orange-600"
              >
                <Text className="text-white text-center font-semibold">
                  Try Again
                </Text>
              </Pressable>
              
              <Pressable
                onPress={async () => {
                  await this.clearAllData();
                  this.resetError();
                }}
                className="bg-slate-600 py-4 px-6 rounded-lg active:bg-slate-700"
              >
                <Text className="text-white text-center font-semibold">
                  Reset App Data
                </Text>
              </Pressable>
            </View>
            
            <Text className="text-slate-500 text-xs text-center mt-8">
              If the problem persists, try restarting the app completely.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;