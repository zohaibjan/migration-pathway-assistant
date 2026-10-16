import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS } from '../../constants';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style
}: PrimaryButtonProps) {
  const secondary = variant === 'secondary';
  const danger = variant === 'danger';

  const handlePress = () => {
    const impact = danger
      ? Haptics.ImpactFeedbackStyle.Heavy
      : secondary
      ? Haptics.ImpactFeedbackStyle.Light
      : Haptics.ImpactFeedbackStyle.Medium;
    Haptics.impactAsync(impact).catch(() => {});
    onPress();
  };

  if (secondary || danger) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.flat,
          danger ? styles.danger : styles.secondary,
          (disabled || loading) && styles.disabled,
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator color={danger ? COLORS.rose600 : COLORS.ink900} />
        ) : (
          <Text style={[styles.flatText, danger && styles.dangerText]}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[styles.primary, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.cream50} />
      ) : (
        <Text style={styles.primaryText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: COLORS.ink900,
    borderRadius: RADIUS.full,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22
  },
  primaryText: {
    color: COLORS.cream50,
    fontFamily: FONTS.sans,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2
  },
  flat: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    paddingHorizontal: 22,
    borderWidth: 1
  },
  secondary: {
    backgroundColor: COLORS.cream50,
    borderColor: COLORS.ink900
  },
  danger: {
    backgroundColor: COLORS.rose100,
    borderColor: COLORS.rose600
  },
  flatText: {
    color: COLORS.ink900,
    fontFamily: FONTS.sans,
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2
  },
  dangerText: {
    color: COLORS.rose600
  },
  disabled: {
    opacity: 0.45
  }
});
