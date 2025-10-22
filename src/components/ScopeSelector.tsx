import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Scope, getScopeOptions } from '../utils/dateRangeUtils';

interface ScopeSelectorProps {
  selectedScope: Scope;
  onScopeChange: (scope: Scope) => void;
}

export const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  selectedScope,
  onScopeChange,
}) => {
  const scopeOptions = getScopeOptions();

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
    }}>
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#F7FAFC',
        borderRadius: 8,
      }}>
        {scopeOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onScopeChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 8,
              borderRadius: 6,
              backgroundColor: selectedScope === option.value ? '#FF9900' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: selectedScope === option.value ? '600' : '500',
              color: selectedScope === option.value ? 'white' : '#4A5568',
            }}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
