import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Logo } from '../components/Logo';

interface SignUpScreenProps {
  navigation: any;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { signUpWithEmail, signInWithGoogle, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [localError, setLocalError] = useState<string | null>(null);

  const handleEmailSignUp = async () => {
    // Clear any existing errors first
    clearError();
    setLocalError(null);
    
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await signUpWithEmail(formData.email, formData.password, formData.name);
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      // Error is handled by the store
    }
  };



  const updateFormData = (key: string, value: string) => {
    if (error) clearError();
    if (localError) setLocalError(null);
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const displayError = error || localError;

  return (
    <SafeAreaView className="flex-1 bg-slate-800">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4 pb-8">
          {/* Header with logo and back button */}
          <View className="flex-row items-center justify-between mb-6">
            <Logo size={60} />
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="#cbd5e1" />
            </Pressable>
          </View>

          {/* Header */}
          <View className="items-center mb-6">
            <View className="mb-5">
              <Text className="text-4xl font-bold text-white mb-2 text-center">
                <Text className="text-white">1099</Text>
                <Text className="text-orange-500"> Suite</Text>
              </Text>
              <Text className="text-slate-300 text-center text-base">
                What Gets Monitored Gets Managed
              </Text>
            </View>
            
            <Text className="text-2xl font-bold text-white mb-3">Create Your Account</Text>
            <Text className="text-slate-300 text-center text-sm leading-relaxed px-4 mb-4">
              Built for Independent Contractors - Track your KPIs, manage expenses, and grow your business.
            </Text>
            
            {/* Account Benefits */}
            <View className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
              <Text className="text-orange-400 font-semibold text-sm mb-2 text-center">Your Data, Secure & Accessible</Text>
              <View className="space-y-2">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#fb923c" />
                  <Text className="text-slate-300 text-xs ml-2">All your daily inputs & KPIs saved securely</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#fb923c" />
                  <Text className="text-slate-300 text-xs ml-2">Access your data from any device</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#fb923c" />
                  <Text className="text-slate-300 text-xs ml-2">Never lose your business progress</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#fb923c" />
                  <Text className="text-slate-300 text-xs ml-2">Historical data & trends preserved</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Error Message */}
          {displayError && (
            <Animated.View 
              entering={FadeInDown} 
              exiting={FadeOutUp}
              className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex-row items-center mb-6"
            >
              <View className="w-6 h-6 bg-red-500 rounded-full items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={14} color="white" />
              </View>
              <Text className="text-red-200 font-medium flex-1">{displayError}</Text>
            </Animated.View>
          )}

          {/* Sign Up Form */}
          <View className="mb-8">
            <View className="mb-4">
              <Text className="text-slate-200 font-medium mb-2">Full Name</Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
                placeholder="Enter your full name"
                placeholderTextColor="#64748b"
                autoCapitalize="words"
                className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-4 text-white text-lg"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-200 font-medium mb-2">Email</Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                placeholder="Enter your email"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-4 text-white text-lg"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-200 font-medium mb-2">Password</Text>
              <TextInput
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                placeholder="Create a password (min. 6 characters)"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-4 text-white text-lg"
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-200 font-medium mb-2">Confirm Password</Text>
              <TextInput
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                placeholder="Confirm your password"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-4 text-white text-lg"
              />
            </View>

            <Pressable
              onPress={handleEmailSignUp}
              disabled={isLoading}
              className={cn(
                "bg-orange-500 rounded-xl py-4 flex-row items-center justify-center mb-4",
                isLoading && "opacity-50"
              )}
            >
              {isLoading && (
                <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              )}
              <Text className="text-white font-semibold text-lg">
                {isLoading ? 'Creating Account...' : 'Get Started Today'}
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View className="flex-row items-center mb-8">
            <View className="flex-1 h-px bg-slate-600" />
            <Text className="px-4 text-slate-400 font-medium">or continue with</Text>
            <View className="flex-1 h-px bg-slate-600" />
          </View>

          {/* Social Sign In */}
          <View className="mb-8">
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              className="bg-slate-700 border border-slate-600 rounded-xl py-4 flex-row items-center justify-center mb-3"
            >
              <View className="w-6 h-6 bg-red-500 rounded-full items-center justify-center mr-3">
                <Ionicons name="logo-google" size={16} color="white" />
              </View>
              <Text className="text-white font-semibold text-lg">Continue with Google</Text>
            </Pressable>


          </View>

          {/* Demo Account */}
          <View className="mb-6">
            <Pressable
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
              className="bg-slate-600 border border-slate-500 rounded-xl py-3 flex-row items-center justify-center"
            >
              <Ionicons name="play" size={14} color="#f97316" />
              <Text className="text-slate-200 font-medium text-sm ml-2">Try Demo Account First</Text>
            </Pressable>
            <Text className="text-xs text-slate-400 text-center mt-1">
              Explore all features with sample data
            </Text>
          </View>

          {/* Terms */}
          <Text className="text-sm text-slate-400 text-center mb-8">
            By creating an account, you agree to our Terms of Service and Privacy Policy designed for independent contractors
          </Text>

          {/* Sign In Link */}
          <View className="flex-row justify-center">
            <Text className="text-slate-300 mr-2">Already have an account?</Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text className="text-orange-500 font-semibold">Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};