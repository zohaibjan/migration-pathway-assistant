import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS } from '../../constants';

interface OptionPillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function OptionPill({ label, selected, onPress }: OptionPillProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 14, stiffness: 280 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 280 });
  };
  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pill, selected && styles.selected]}
      >
        {selected ? (
          <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
            <Text style={[styles.text, styles.selectedText]}>{label}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.text}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginRight: 8,
    marginBottom: 8
  },
  pill: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.white,
    overflow: 'hidden'
  },
  selected: {
    borderColor: 'transparent'
  },
  gradient: {
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  text: {
    color: COLORS.slate700,
    fontWeight: '700',
    fontSize: 13,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  selectedText: {
    color: COLORS.white,
    paddingVertical: 0,
    paddingHorizontal: 0
  }
});
