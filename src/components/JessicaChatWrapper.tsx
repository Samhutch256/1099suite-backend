import React from 'react';
import { View } from 'react-native';
import { JessicaFloatingButton } from './JessicaFloatingButton';
import { JessicaChatOverlay } from './JessicaChatOverlay';
import { useJessicaChatStore } from '../state/jessicaChatStore';

interface JessicaChatWrapperProps {
  children: React.ReactNode;
}

export const JessicaChatWrapper: React.FC<JessicaChatWrapperProps> = ({ children }) => {
  const { isVisible, showChat, hideChat } = useJessicaChatStore();

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {children}
      <JessicaFloatingButton onPress={showChat} />
      <JessicaChatOverlay 
        visible={isVisible} 
        onClose={hideChat} 
      />
    </View>
  );
}; 