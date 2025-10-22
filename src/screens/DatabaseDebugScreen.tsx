import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { databaseService } from '../services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const DatabaseDebugScreen: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const collectDebugInfo = async () => {
    setLoading(true);
    try {
      const info: any = {
        timestamp: new Date().toISOString(),
      };

      // Get database info
      try {
        info.database = await databaseService.getDatabaseInfo();
      } catch (error) {
        info.database = { error: error.message };
      }

      // Get AsyncStorage keys
      try {
        info.asyncStorageKeys = await AsyncStorage.getAllKeys();
      } catch (error) {
        info.asyncStorageKeys = { error: error.message };
      }

      // Get auth token
      try {
        info.authToken = await SecureStore.getItemAsync('auth_token');
      } catch (error) {
        info.authToken = { error: error.message };
      }

      // Schema verification
      try {
        info.schemaValid = await databaseService.verifySchema();
      } catch (error) {
        info.schemaValid = { error: error.message };
      }

      setDebugInfo(info);
    } catch (error) {
      console.error('Failed to collect debug info:', error);
      Alert.alert('Error', 'Failed to collect debug information');
    } finally {
      setLoading(false);
    }
  };

  const resetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete all local data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Clear AsyncStorage
              await AsyncStorage.clear();
              
              // Delete auth token
              await SecureStore.deleteItemAsync('auth_token');
              
              Alert.alert('Success', 'Database reset. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', `Failed to reset: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    collectDebugInfo();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-800">
      <View className="flex-row items-center justify-between p-4 border-b border-slate-700">
        <Text className="text-xl font-bold text-white">Database Debug</Text>
        <Pressable 
          onPress={collectDebugInfo}
          className="bg-orange-500 px-4 py-2 rounded-lg"
          disabled={loading}
        >
          <Text className="text-white font-semibold">
            {loading ? 'Loading...' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          {/* Database Status */}
          <View className="bg-slate-700 rounded-lg p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="server" size={20} color="#f97316" />
              <Text className="text-white font-bold ml-2 text-lg">Database Status</Text>
            </View>
            <Text className="text-slate-300 font-mono text-sm">
              {JSON.stringify(debugInfo.database, null, 2)}
            </Text>
          </View>

          {/* Schema Verification */}
          <View className="bg-slate-700 rounded-lg p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text className="text-white font-bold ml-2 text-lg">Schema Valid</Text>
            </View>
            <Text className="text-slate-300 font-mono text-sm">
              {JSON.stringify(debugInfo.schemaValid, null, 2)}
            </Text>
          </View>

          {/* Auth Token */}
          <View className="bg-slate-700 rounded-lg p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="key" size={20} color="#eab308" />
              <Text className="text-white font-bold ml-2 text-lg">Auth Token</Text>
            </View>
            <Text className="text-slate-300 font-mono text-sm">
              {debugInfo.authToken ? 'Present' : 'Missing'}
            </Text>
          </View>

          {/* AsyncStorage Keys */}
          <View className="bg-slate-700 rounded-lg p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="list" size={20} color="#8b5cf6" />
              <Text className="text-white font-bold ml-2 text-lg">Storage Keys</Text>
            </View>
            <Text className="text-slate-300 font-mono text-xs">
              {JSON.stringify(debugInfo.asyncStorageKeys, null, 2)}
            </Text>
          </View>

          {/* Actions */}
          <View className="bg-slate-700 rounded-lg p-4">
            <Text className="text-white font-bold mb-4 text-lg">Actions</Text>
            <Pressable
              onPress={resetDatabase}
              className="bg-red-600 py-3 px-4 rounded-lg mb-3"
              disabled={loading}
            >
              <Text className="text-white text-center font-semibold">
                Reset Database & Storage
              </Text>
            </Pressable>
            
            <Text className="text-slate-400 text-xs text-center">
              Last updated: {debugInfo.timestamp}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};