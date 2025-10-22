import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { cn } from '../utils/cn';

import PlaidLinkWebView from './PlaidLinkWebView';

interface PlaidLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: () => Promise<{ success: boolean; linkToken?: string; error?: string }>;
  isLoading: boolean;
  userId: string | null;
}

export const PlaidLinkModal: React.FC<PlaidLinkModalProps> = ({
  visible,
  onClose,
  onConnect,
  isLoading,
  userId,
}) => {
  const [step, setStep] = useState<'info' | 'connecting' | 'success' | 'error'>('info');
  const rotation = useSharedValue(0);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [showPlaidLink, setShowPlaidLink] = useState(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  useEffect(() => {
    if (step === 'connecting') {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 200 });
    }
  }, [step, rotation]);
  
  const resetModal = () => {
    setStep('info');
    setLinkToken(null);
    setShowPlaidLink(false);
  };

  const handleConnect = async () => {
    setStep('connecting');
    try {
      const result = await onConnect();
      if (result.success && result.linkToken) {
        setLinkToken(result.linkToken);
        setShowPlaidLink(true);
      } else if (result.success) {
        setStep('success');
        setTimeout(() => {
          onClose();
          resetModal();
        }, 2000);
      } else {
        setStep('error');
      }
    } catch (error) {
      setStep('error');
    }
  };

  const handleClose = () => {
    if (step !== 'connecting') {
      setShowPlaidLink(false);
      onClose();
      resetModal();
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'info':
        return (
          <>
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-4">
                <Ionicons name="card" size={32} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Connect Bank/Cards</Text>
              <Text className="text-gray-600 text-center text-lg leading-relaxed">
                Securely connect your bank accounts and credit cards to automatically import and categorize business expenses
              </Text>
            </View>

            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3">
                  <Ionicons name="shield-checkmark" size={16} color="white" />
                </View>
                <Text className="text-gray-700">Bank-level security with 256-bit encryption</Text>
              </View>
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3">
                  <Ionicons name="eye-off" size={16} color="white" />
                </View>
                <Text className="text-gray-700">Read-only access - we cannot move money</Text>
              </View>
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3">
                  <Ionicons name="time" size={16} color="white" />
                </View>
                <Text className="text-gray-700">Automatically import and categorize transactions</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3">
                  <Ionicons name="analytics" size={16} color="white" />
                </View>
                <Text className="text-gray-700">Separate business and personal expenses for taxes</Text>
              </View>
            </View>

            <View className="space-y-3">
              <Pressable
                onPress={handleConnect}
                className="bg-blue-500 rounded-xl py-4 flex-row items-center justify-center"
              >
                <Ionicons name="card" size={20} color="white" />
                <Text className="text-white font-semibold text-lg ml-2">Connect Bank/Cards</Text>
              </Pressable>
              
              <Pressable
                onPress={handleClose}
                className="bg-gray-100 rounded-xl py-4 flex-row items-center justify-center"
              >
                <Text className="text-gray-700 font-medium text-lg">Maybe Later</Text>
              </Pressable>
            </View>

            <Text className="text-xs text-gray-500 text-center mt-6">
              Powered by Plaid - Trusted by millions of users
            </Text>
          </>
        );

      case 'connecting':
        return (
          <View className="items-center py-12">
            <Animated.View 
              style={[animatedStyle, { 
                width: 64, 
                height: 64, 
                borderWidth: 4, 
                borderColor: '#3b82f6', 
                borderTopColor: 'transparent', 
                borderRadius: 32,
                marginBottom: 24
              }]} 
            />
            <Text className="text-xl font-semibold text-gray-900 mb-2">Connecting Your Account</Text>
            <Text className="text-gray-600 text-center">
              Please wait while we securely connect to your bank...
            </Text>
          </View>
        );

      case 'success':
        return (
          <View className="items-center py-12">
            <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark" size={32} color="white" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">Successfully Connected!</Text>
            <Text className="text-gray-600 text-center">
              Your account has been connected. We're now importing your recent transactions.
            </Text>
          </View>
        );

      case 'error':
        return (
          <View className="items-center py-12">
            <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="close" size={32} color="white" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</Text>
            <Text className="text-gray-600 text-center mb-8">
              We couldn't connect to your bank account. Please try again.
            </Text>
            <View className="flex-row space-x-3">
              <Pressable
                onPress={handleConnect}
                className="bg-blue-500 rounded-xl py-3 px-6"
              >
                <Text className="text-white font-medium">Try Again</Text>
              </Pressable>
              <Pressable
                onPress={handleClose}
                className="bg-gray-100 rounded-xl py-3 px-6"
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </Pressable>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          {step === 'info' && (
            <View className="flex-row justify-end mb-4">
              <Pressable
                onPress={handleClose}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>
          )}

          {/* Content */}
          <View className="flex-1">
            {renderContent()}
          </View>
        </View>
      </SafeAreaView>

      {userId && (
        <PlaidLinkWebView
          visible={showPlaidLink}
          onSuccess={() => {
            setStep('success');
            setShowPlaidLink(false);
            setTimeout(() => {
              onClose();
              resetModal();
            }, 2000);
          }}
          onClose={() => {
            setShowPlaidLink(false);
            if (step === 'connecting') {
              setStep('info');
            }
          }}
          userId={userId}
          linkToken={linkToken}
        />
      )}
    </Modal>
  );
};
