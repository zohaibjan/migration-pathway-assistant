import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADIUS } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  /** Applied to the inner content container — use for layout (flexDirection, gap, padding overrides). */
  style?: ViewStyle;
  /** Applied to the outer card wrapper — use for border/shadow/radius overrides. */
  outerStyle?: ViewStyle;
  delay?: number;
  /** Visual tone. 'warm' = cream→peach gradient. 'plain' = flat cream. 'dark' = ink card for emphasis. */
  tone?: 'warm' | 'plain' | 'dark';
}

export default function Card({
  children,
  style,
  outerStyle,
  delay = 0,
  tone = 'warm'
}: CardProps) {
  const innerColors: [string, string] =
    tone === 'warm'
      ? [GRADIENTS.card[0], GRADIENTS.card[1]]
      : tone === 'dark'
      ? [COLORS.ink900, COLORS.ink700]
      : [COLORS.cream50, COLORS.cream50];

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420).springify().damping(16)}
      style={[
        styles.card,
        tone === 'dark' ? styles.cardDark : styles.cardLight,
        outerStyle
      ]}
    >
      <LinearGradient
        colors={innerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.inner, style]}>{children}</View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden'
  },
  cardLight: {
    borderWidth: 1,
    borderColor: 'rgba(17,20,15,0.06)',
    backgroundColor: COLORS.cream50,
    shadowColor: '#11140F',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  cardDark: {
    backgroundColor: COLORS.ink900,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  gradient: {
    flex: 0
  },
  inner: {
    padding: 18
  }
});
