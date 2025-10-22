import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface LoadingScreenProps {
  onTimeout?: () => void;
  timeoutDuration?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  onTimeout, 
  timeoutDuration = 5000 
}) => {
  const [showTimeout, setShowTimeout] = useState(false);
  const [loadingText, setLoadingText] = useState('Setting Up Your Dashboard');

  useEffect(() => {
    const messages = [
      'Setting Up Your Dashboard',
      'Loading Your Data',
      'Syncing Account Information',
      'Almost Ready...'
    ];
    
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingText(messages[messageIndex]);
    }, 1500);

    const timeoutTimer = setTimeout(() => {
      setShowTimeout(true);
      clearInterval(messageInterval);
    }, timeoutDuration);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(timeoutTimer);
    };
  }, [timeoutDuration]);

  if (showTimeout) {
    return (
      <SafeAreaView className="flex-1 bg-slate-800">
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-8 items-center">
            <Ionicons name="time" size={64} color="#f97316" className="mb-4" />
            <Text className="text-2xl font-bold text-white mb-2 text-center">
              Taking longer than expected
            </Text>
            <Text className="text-slate-300 text-center mb-6">
              The app is taking longer to load. This might be due to network issues or first-time setup.
            </Text>
          </View>
          
          {onTimeout && (
            <Pressable
              onPress={onTimeout}
              className="bg-orange-500 py-4 px-8 rounded-lg active:bg-orange-600"
            >
              <Text className="text-white text-center font-semibold">
                Continue Anyway
              </Text>
            </Pressable>
          )}
          
          <Text className="text-slate-500 text-xs text-center mt-6">
            You can also try restarting the app completely
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-800">
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-8">
          <Text className="text-4xl font-bold text-white mb-4 text-center">
            <Text className="text-white">1099</Text>
            <Text className="text-orange-500"> Suite</Text>
          </Text>
          <Text className="text-slate-300 text-center text-lg">
            What Gets Monitored Gets Managed
          </Text>
        </View>
        
        <ActivityIndicator size="large" color="#f97316" className="mb-6" />
        
        <Text className="text-xl font-semibold text-white mb-2">
          {loadingText}
        </Text>
        <Text className="text-slate-300 text-center">
          Preparing your personalized contractor experience
        </Text>
      </View>
    </SafeAreaView>
  );
};