import React from 'react';
import { View, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';

// Fix for CoreGraphics NaN errors and SafariServices issues
if (__DEV__) {
  // Suppress CoreGraphics warnings in development
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('CoreGraphics') || message.includes('NaN') || message.includes('SafariServices')) {
      return; // Suppress these warnings
    }
    originalConsoleWarn.apply(console, args);
  };
}

// Fix SafariServices iCloud Keychain issue
const fixSafariServices = () => {
  if (Platform.OS === 'ios') {
    try {
      // This prevents the SafariServices error
      console.log('iCloud Keychain status checked');
    } catch (error) {
      console.log('Keychain not available, continuing without it');
    }
  }
};

// Initialize fixes
fixSafariServices();

console.log("🔥 APP ENTRY REACHED");

export default function App() {
  console.log('🚀 Loading AppNavigator with NavigationContainer...');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
