import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Logo } from '../components/Logo';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signInWithEmail, signInWithGoogle, isLoading, error, clearError, requestPasswordReset } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const handleEmailSignIn = async () => {
    try {
      // Clear any existing errors first
      clearError();
      
      // Basic validation
      if (!formData.email.trim()) {
        return; // Let the store handle this validation
      }
      if (!formData.password.trim()) {
        return; // Let the store handle this validation
      }
      
      await signInWithEmail(formData.email, formData.password);
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

  const handleSendResetEmail = async () => {
    try {
      clearError();
      const emailToUse = resetEmail.trim() || formData.email.trim();
      if (!emailToUse) return;
      setSendingReset(true);
      await requestPasswordReset(emailToUse);
      setShowResetModal(false);
    } catch (e) {
      // store handles error display
    } finally {
      setSendingReset(false);
    }
  };



  const updateFormData = (key: string, value: string) => {
    if (error) clearError();
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-800">
      <View className="flex-1 px-5 pt-2">
        {/* Logo in top left */}
        <View className="mb-4">
          <Logo size={50} className="items-start" />
        </View>

        {/* Header */}
        <View className="items-center mb-6">
          <View className="mb-4">
            <Text className="text-3xl font-bold text-white mb-1 text-center">
              <Text className="text-white">1099</Text>
              <Text className="text-orange-500"> Suite</Text>
            </Text>
            <Text className="text-slate-300 text-center text-base">
              What Gets Monitored Gets Managed
            </Text>
          </View>

          <Text className="text-xl font-bold text-white mb-2">Welcome Back</Text>
          <Text className="text-slate-300 text-center text-sm leading-relaxed px-2 mb-3">
            Access your saved data and continue tracking your business progress.
          </Text>
          
          {/* Account Benefits Reminder */}
          <View className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <View className="flex-row items-center justify-center">
              <Ionicons name="cloud-done" size={16} color="#10b981" />
              <Text className="text-green-400 text-xs ml-2 font-medium">Your data is securely saved</Text>
            </View>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <Animated.View 
            entering={FadeInDown} 
            exiting={FadeOutUp}
            className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex-row items-center mb-6"
          >
            <View className="w-6 h-6 bg-red-500 rounded-full items-center justify-center mr-3">
              <Ionicons name="alert-circle" size={14} color="white" />
            </View>
            <Text className="text-red-200 font-medium flex-1">{error}</Text>
          </Animated.View>
        )}

        {/* Email Form */}
        <View className="mb-5">
          <View className="mb-3">
            <Text className="text-slate-200 font-medium mb-2 text-sm">Email</Text>
            <TextInput
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              placeholder="Enter your email"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-3.5 text-white text-base"
            />
          </View>

          <View className="mb-4">
            <Text className="text-slate-200 font-medium mb-2 text-sm">Password</Text>
            <TextInput
              value={formData.password}
              onChangeText={(text) => updateFormData('password', text)}
              placeholder="Enter your password"
              placeholderTextColor="#64748b"
              secureTextEntry
              className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-3.5 text-white text-base"
            />
          </View>

          <Pressable
            onPress={handleEmailSignIn}
            disabled={isLoading}
            className={cn(
              "bg-orange-500 rounded-xl py-3.5 flex-row items-center justify-center mb-3",
              isLoading && "opacity-50"
            )}
          >
            {isLoading && (
              <View className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            )}
            <Text className="text-white font-semibold text-base">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </Pressable>

          {/* Sign Up Link */}
          <View className="flex-row justify-center mb-4">
            <Text className="text-slate-300 mr-1 text-sm">Don't have an account?</Text>
            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text className="text-orange-500 font-semibold text-sm">Get Started Today</Text>
            </Pressable>
          </View>

          {/* Forgot Password (moved here) */}
          <View className="items-center mb-2">
            <Pressable onPress={() => setShowResetModal(true)}>
              <Text className="text-orange-400 text-xs font-semibold">Forgot password?</Text>
            </Pressable>
          </View>
        </View>

        {/* Divider */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-slate-600" />
          <Text className="px-3 text-slate-400 font-medium text-xs">or continue with</Text>
          <View className="flex-1 h-px bg-slate-600" />
        </View>

        {/* Social Sign In */}
        <View className="mb-4">
                          <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                  className="bg-slate-700 border border-slate-600 rounded-xl py-3 flex-row items-center justify-center mb-2"
                >
                  <View className="w-4 h-4 bg-red-500 rounded-full items-center justify-center mr-2">
                    <Ionicons name="logo-google" size={12} color="white" />
                  </View>
                  <Text className="text-white font-medium text-sm">Continue with Google</Text>
                </Pressable>


        </View>

        

      </View>

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-slate-800">
          <View className="p-4 border-b border-slate-700 flex-row items-center justify-between">
            <Text className="text-white text-lg font-bold">Reset Password</Text>
            <Pressable onPress={() => setShowResetModal(false)} className="w-8 h-8 rounded-full items-center justify-center bg-slate-700">
              <Ionicons name="close" size={18} color="#cbd5e1" />
            </Pressable>
          </View>

          <View className="p-5">
            <Text className="text-slate-300 mb-2">Email</Text>
            <TextInput
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder={formData.email || 'Enter your email'}
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-slate-700 border border-slate-600 rounded-xl px-4 py-3.5 text-white text-base mb-4"
            />

            <View className="flex-row space-x-3">
              <Pressable onPress={() => setShowResetModal(false)} className="flex-1 bg-slate-600 rounded-xl py-3 items-center justify-center">
                <Text className="text-slate-200 font-medium">Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSendResetEmail} disabled={sendingReset} className="flex-1 bg-orange-500 rounded-xl py-3 items-center justify-center">
                <Text className="text-white font-semibold">{sendingReset ? 'Sending...' : 'Send Reset Email'}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};