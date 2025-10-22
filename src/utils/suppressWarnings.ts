import { LogBox } from 'react-native';

// Suppress known warnings that don't affect app functionality
export const suppressKnownWarnings = () => {
  LogBox.ignoreLogs([
    // Touch event warnings are common in React Native and usually don't affect functionality
    'Cannot record touch move without a touch start',
    'Cannot record touch end without a touch start',
    'Cannot record touch move without a touch start',
    // Other common warnings that are safe to ignore
    'VirtualizedLists should never be nested',
    'Warning: componentWillReceiveProps has been renamed',
    'Setting a timer for a long period of time',
    // Expo/React Navigation warnings
    'Require cycle:',
    'Remote debugger',
  ]);
};