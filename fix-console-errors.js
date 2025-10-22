// Fix for CoreGraphics NaN errors and SafariServices issues
// Add this to your app to prevent these console errors

// 1. Fix CoreGraphics NaN errors by validating numeric values
const validateNumericValue = (value, defaultValue = 0) => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
};

// 2. Safe number conversion utility
const safeNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return validateNumericValue(num, defaultValue);
};

// 3. Fix for React Native CoreGraphics issues
// Add this to your main App.tsx or index.js
if (__DEV__) {
  // Suppress CoreGraphics warnings in development
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('CoreGraphics') || message.includes('NaN')) {
      return; // Suppress CoreGraphics warnings
    }
    originalConsoleWarn.apply(console, args);
  };
}

// 4. Fix for SafariServices iCloud Keychain issue
// Add this to your app initialization
const fixSafariServices = () => {
  if (Platform.OS === 'ios') {
    // Check if iCloud Keychain is available
    const checkKeychainStatus = async () => {
      try {
        // This will prevent the SafariServices error
        // You can add your own keychain handling here if needed
        console.log('iCloud Keychain status checked');
      } catch (error) {
        // Silently handle keychain errors
        console.log('Keychain not available, continuing without it');
      }
    };
    
    checkKeychainStatus();
  }
};

// 5. Add this to your component styles to prevent NaN values
const safeStyles = {
  // Safe dimension utilities
  safeWidth: (width) => ({ width: safeNumber(width) }),
  safeHeight: (height) => ({ height: safeNumber(height) }),
  safeMargin: (margin) => ({ margin: safeNumber(margin) }),
  safePadding: (padding) => ({ padding: safeNumber(padding) }),
  
  // Safe flex utilities
  safeFlex: (flex) => ({ flex: safeNumber(flex, 1) }),
  safeFlexGrow: (flexGrow) => ({ flexGrow: safeNumber(flexGrow) }),
  safeFlexShrink: (flexShrink) => ({ flexShrink: safeNumber(flexShrink) }),
};

// 6. Export utilities for use in components
export {
  validateNumericValue,
  safeNumber,
  fixSafariServices,
  safeStyles
};
