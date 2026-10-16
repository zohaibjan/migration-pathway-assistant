import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';

const TAB_BAR_HEIGHT = 86;

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  hasTabBar?: boolean;
  /** When true, paints the deep teal backdrop (used by Auth and landing screens). */
  teal?: boolean;
}

export default function Screen({
  children,
  scroll = true,
  contentStyle,
  hasTabBar = true,
  teal = false
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = hasTabBar
    ? TAB_BAR_HEIGHT + Math.max(insets.bottom, 8)
    : Math.max(insets.bottom, 24);

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.nonScroll, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, { backgroundColor: teal ? COLORS.teal800 : COLORS.cream50 }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {content}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, gap: 16 },
  nonScroll: { flex: 1 }
});
