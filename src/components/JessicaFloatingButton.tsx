import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';

interface JessicaFloatingButtonProps {
  style?: any;
  onPress: () => void;
}

export const JessicaFloatingButton: React.FC<JessicaFloatingButtonProps> = ({ style, onPress }) => {
  console.log('JessicaFloatingButton - Rendering button');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.floatingButton, style]}
      activeOpacity={0.8}
    >
      <View style={styles.aiLogoContainer}>
        <View style={styles.circuitOuterRing} />
        <View style={styles.circuitInnerRing} />
        <View style={styles.aiTextContainer}>
          <Text style={styles.aiTextA}>A</Text>
          <Text style={styles.aiTextI}>I</Text>
        </View>
        <View style={styles.circuitDots}>
          <View style={[styles.circuitDot, { top: 2, left: 20 }]} />
          <View style={[styles.circuitDot, { top: 20, right: 2 }]} />
          <View style={[styles.circuitDot, { bottom: 2, left: 20 }]} />
          <View style={[styles.circuitDot, { top: 20, left: 2 }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a1f2e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    borderWidth: 2,
    borderColor: '#ff8c00',
  },
  aiLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1f2e',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ff8c00',
  },
  aiTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextA: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  aiTextI: {
    color: '#ff8c00',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  circuitOuterRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#ff8c00',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    transform: [{ rotate: '-45deg' }],
  },
  circuitInnerRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ff8c00',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    transform: [{ rotate: '45deg' }],
  },
  circuitDots: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  circuitDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ff8c00',
  },
}); 