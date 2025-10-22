import React from 'react';
import { useNavigation } from '@react-navigation/native';

interface NavigationWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const NavigationWrapper: React.FC<NavigationWrapperProps> = ({ 
  children, 
  fallback = null 
}) => {
  try {
    const navigation = useNavigation();
    if (navigation) {
      return <>{children}</>;
    }
    return <>{fallback}</>;
  } catch (error) {
    console.log('Navigation context not available, rendering fallback');
    return <>{fallback}</>;
  }
};