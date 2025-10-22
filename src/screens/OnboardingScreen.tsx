import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInputSettingsStore } from '../state/inputSettingsStore';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';
import { Logo } from '../components/Logo';
import { LinearGradient } from 'expo-linear-gradient';

interface OnboardingScreenProps {
  navigation: any;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedInputs, setSelectedInputs] = useState<{[key: string]: boolean}>({});
  
  const { updateSettings, resetToDefaults } = useInputSettingsStore();
  const { user, updateUserProfile } = useAuthStore();

  const steps = [
    'Welcome',
    'Input Customization',
    'Complete'
  ];

  const handleInputToggle = (inputKey: string) => {
    setSelectedInputs(prev => ({
      ...prev,
      [inputKey]: !prev[inputKey]
    }));
  };

  const handleComplete = async () => {
    try {
      // Apply default settings for all inputs
      const defaultInputs: {[key: string]: { enabled: boolean }} = {
        outreachAttempts: { enabled: true },
        appointmentsSet: { enabled: true },
        appointmentsHeld: { enabled: true },
        dealsClosed: { enabled: true },
        accountsServiced: { enabled: true },
        hoursWorked: { enabled: true },
        notes: { enabled: true }
      };
      
      // Override with user's custom selections
      Object.entries(selectedInputs).forEach(([key, enabled]) => {
        if (defaultInputs[key]) {
          defaultInputs[key].enabled = enabled;
        }
      });

      // Update input settings
      Object.entries(defaultInputs).forEach(([key, config]) => {
        updateSettings(key, config.enabled);
      });

      // Update user profile
      if (user) {
        await updateUserProfile({
          onboardingCompleted: true
        });
      }

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
      
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const renderWelcomeStep = () => (
    <View className="flex-1 justify-center items-center px-6">
      <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center mb-6">
        <Logo size={48} />
      </View>
      <Text className="text-3xl font-bold text-white text-center mb-4">
        Welcome to 1099Suite
      </Text>
      <Text className="text-lg text-gray-300 text-center mb-8">
        Let's set up your tracking preferences to get you started.
      </Text>
      
      <View className="bg-gray-800/50 border border-gray-600 rounded-xl p-4 mb-8 w-full">
        <Text className="text-sm font-medium text-blue-400 mb-2">What we'll do:</Text>
        <Text className="text-sm text-gray-300">
          • Customize your daily input fields{'\n'}
          • Set up your tracking preferences{'\n'}
          • Get you ready to start tracking
        </Text>
      </View>

      <Pressable
        onPress={() => setCurrentStep(1)}
        className="bg-blue-500 px-8 py-4 rounded-xl w-full"
      >
        <Text className="text-white font-semibold text-lg text-center">Get Started</Text>
      </Pressable>
    </View>
  );

  const inputLabels: {[key: string]: {title: string, description: string}} = {
    outreachAttempts: {
      title: 'Outreach Attempts',
      description: 'Track your prospecting and lead generation activities'
    },
    appointmentsSet: {
      title: 'Appointments Set',
      description: 'Track scheduled meetings and consultations'
    },
    appointmentsHeld: {
      title: 'Appointments Held',
      description: 'Track completed meetings and consultations'
    },
    dealsClosed: {
      title: 'Deals Closed',
      description: 'Track successful sales and signed contracts'
    },
    accountsServiced: {
      title: 'Accounts Serviced',
      description: 'Track completed installations or implementations'
    },
    hoursWorked: {
      title: 'Hours Worked',
      description: 'Track daily work hours and time spent'
    },
    notes: {
      title: 'Notes',
      description: 'Add daily notes and observations'
    }
  };

  const renderCustomizationStep = () => (
    <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-white mb-2">Customize Your Tracking</Text>
      <Text className="text-gray-300 mb-6">
        Choose which metrics you want to track daily. You can always change these later.
      </Text>

      {Object.entries(inputLabels).map(([key, label]) => (
        <View
          key={key}
          className="flex-row items-center justify-between py-3 px-4 rounded-lg border bg-white border-gray-200 mb-3"
        >
          <View className="flex-row items-center flex-1">
            <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center mr-3">
              <Ionicons name="analytics" size={12} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-base text-gray-900">
                {label.title}
              </Text>
              <Text className="text-sm text-gray-600">
                {label.description}
              </Text>
            </View>
          </View>
          <Switch
            value={selectedInputs[key] || false}
            onValueChange={() => handleInputToggle(key)}
            trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
            thumbColor={selectedInputs[key] ? '#ffffff' : '#ffffff'}
          />
        </View>
      ))}

      <View className="flex-row space-x-3 mt-6">
        <Pressable
          onPress={() => setCurrentStep(0)}
          className="flex-1 bg-gray-700 px-6 py-4 rounded-xl"
        >
          <Text className="text-white font-semibold text-center">Back</Text>
        </Pressable>
        <Pressable
          onPress={() => setCurrentStep(2)}
          className="flex-1 bg-blue-500 px-6 py-4 rounded-xl"
        >
          <Text className="text-white font-semibold text-center">Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderCompleteStep = () => (
    <View className="flex-1 justify-center items-center px-6">
      <View className="w-24 h-24 bg-green-500 rounded-full items-center justify-center mb-6">
        <Ionicons name="checkmark" size={40} color="white" />
      </View>
      <Text className="text-3xl font-bold text-white text-center mb-4">
        You're All Set!
      </Text>
      <Text className="text-lg text-gray-300 text-center mb-8">
        Your app is now ready to use.
      </Text>
      
      <View className="bg-gray-800/50 border border-gray-600 rounded-xl p-4 mb-8 w-full">
        <Text className="text-sm font-medium text-green-400 mb-2">What's Next?</Text>
        <Text className="text-sm text-gray-300">
          • Start tracking your daily activities{'\n'}
          • View your performance in the KPI dashboard{'\n'}
          • Manage leads in your CRM{'\n'}
          • Track business activities
        </Text>
      </View>

      <Pressable
        onPress={handleComplete}
        className="bg-blue-500 px-8 py-4 rounded-xl w-full"
      >
        <Text className="text-white font-semibold text-lg text-center">Start Using 1099Suite</Text>
      </Pressable>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderCustomizationStep();
      case 2:
        return renderCompleteStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <LinearGradient
      colors={['#1a1f2e', '#2d3748', '#4a5568']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-white">Setup</Text>
            <View className="flex-row space-x-2">
              {steps.map((step, index) => (
                <View
                  key={step}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    index <= currentStep ? "bg-blue-500" : "bg-gray-600"
                  )}
                />
              ))}
            </View>
          </View>
        </View>

        {renderStep()}
      </SafeAreaView>
    </LinearGradient>
  );
};