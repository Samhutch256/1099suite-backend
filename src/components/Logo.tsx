import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 80, className }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    // Fallback to icon-based logo
    return (
      <View className={cn("items-center justify-center", className)} style={{ width: size, height: size }}>
        <View 
          className="bg-orange-500 rounded-2xl items-center justify-center"
          style={{ width: size, height: size }}
        >
          <Ionicons name="analytics" size={size * 0.5} color="white" />
        </View>
      </View>
    );
  }

  return (
    <View className={cn("items-center justify-center", className)}>
      <Image
        source={{ uri: 'https://images.composerapi.com/9DCC1F9E-B36F-49F6-9695-1689E2907980.jpg' }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setImageError(true)}
      />
    </View>
  );
};