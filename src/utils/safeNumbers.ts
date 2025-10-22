// Safe number utilities to prevent CoreGraphics NaN errors
import { Platform } from 'react-native';

// Validate numeric values to prevent NaN
export const validateNumericValue = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
};

// Safe number conversion
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  const num = parseFloat(value);
  return validateNumericValue(num, defaultValue);
};

// Safe dimension utilities
export const safeWidth = (width: any): { width: number } => ({ 
  width: safeNumber(width) 
});

export const safeHeight = (height: any): { height: number } => ({ 
  height: safeNumber(height) 
});

export const safeMargin = (margin: any): { margin: number } => ({ 
  margin: safeNumber(margin) 
});

export const safePadding = (padding: any): { padding: number } => ({ 
  padding: safeNumber(padding) 
});

// Safe flex utilities
export const safeFlex = (flex: any): { flex: number } => ({ 
  flex: safeNumber(flex, 1) 
});

export const safeFlexGrow = (flexGrow: any): { flexGrow: number } => ({ 
  flexGrow: safeNumber(flexGrow) 
});

export const safeFlexShrink = (flexShrink: any): { flexShrink: number } => ({ 
  flexShrink: safeNumber(flexShrink) 
});

// Safe position utilities
export const safeTop = (top: any): { top: number } => ({ 
  top: safeNumber(top) 
});

export const safeBottom = (bottom: any): { bottom: number } => ({ 
  bottom: safeNumber(bottom) 
});

export const safeLeft = (left: any): { left: number } => ({ 
  left: safeNumber(left) 
});

export const safeRight = (right: any): { right: number } => ({ 
  right: safeNumber(right) 
});

// Safe border radius
export const safeBorderRadius = (radius: any): { borderRadius: number } => ({ 
  borderRadius: safeNumber(radius) 
});

// Safe font size
export const safeFontSize = (size: any): { fontSize: number } => ({ 
  fontSize: safeNumber(size, 14) 
});

// Safe line height
export const safeLineHeight = (height: any): { lineHeight: number } => ({ 
  lineHeight: safeNumber(height) 
});

// Safe opacity
export const safeOpacity = (opacity: any): { opacity: number } => ({ 
  opacity: Math.max(0, Math.min(1, safeNumber(opacity, 1))) 
});

// Safe z-index
export const safeZIndex = (zIndex: any): { zIndex: number } => ({ 
  zIndex: Math.round(safeNumber(zIndex)) 
});

// Safe transform scale
export const safeScale = (scale: any): { transform: [{ scale: number }] } => ({ 
  transform: [{ scale: safeNumber(scale, 1) }] 
});

// Safe transform translate
export const safeTranslateX = (x: any): { transform: [{ translateX: number }] } => ({ 
  transform: [{ translateX: safeNumber(x) }] 
});

export const safeTranslateY = (y: any): { transform: [{ translateY: number }] } => ({ 
  transform: [{ translateY: safeNumber(y) }] 
});

// Safe shadow utilities (iOS specific)
export const safeShadowOffset = (offset: { width?: any; height?: any }): { shadowOffset: { width: number; height: number } } => ({
  shadowOffset: {
    width: safeNumber(offset?.width),
    height: safeNumber(offset?.height)
  }
});

export const safeShadowRadius = (radius: any): { shadowRadius: number } => ({ 
  shadowRadius: safeNumber(radius) 
});

export const safeShadowOpacity = (opacity: any): { shadowOpacity: number } => ({ 
  shadowOpacity: Math.max(0, Math.min(1, safeNumber(opacity, 0))) 
});

// Safe elevation (Android specific)
export const safeElevation = (elevation: any): { elevation: number } => ({ 
  elevation: Math.max(0, safeNumber(elevation)) 
});

// Combined safe styles object
export const safeStyles = {
  safeWidth,
  safeHeight,
  safeMargin,
  safePadding,
  safeFlex,
  safeFlexGrow,
  safeFlexShrink,
  safeTop,
  safeBottom,
  safeLeft,
  safeRight,
  safeBorderRadius,
  safeFontSize,
  safeLineHeight,
  safeOpacity,
  safeZIndex,
  safeScale,
  safeTranslateX,
  safeTranslateY,
  safeShadowOffset,
  safeShadowRadius,
  safeShadowOpacity,
  safeElevation
};
