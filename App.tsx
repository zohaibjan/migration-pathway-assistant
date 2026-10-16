import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { APP_DISCLAIMER, COLORS, FONTS, isSupabaseConfigured } from './src/constants';
import {
  getDisclaimerAccepted,
  setDisclaimerAccepted
} from './src/services/storage';
import { Card, PrimaryButton, Screen } from './src/components/ui';

function DisclaimerScreen({ onAccept }: { onAccept: () => void }) {
  return (
    <Screen contentStyle={styles.disclaimerContent} hasTabBar={false}>
      <Text style={styles.kicker}>Migration Assist</Text>
      <Text style={styles.title}>General visa pathway guidance</Text>
      <Card>
        <Text style={styles.cardTitle}>Before you start</Text>
        <Text style={styles.body}>{APP_DISCLAIMER}</Text>
        <Text style={styles.body}>
          The app helps you understand possible Australian visa pathways, likely eligibility
          gaps, and documents to prepare. It does not lodge applications or guarantee eligibility.
        </Text>
      </Card>
      <PrimaryButton title="I understand — continue" onPress={onAccept} />
    </Screen>
  );
}

export default function App() {
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    getDisclaimerAccepted().then(setAccepted);
  }, []);

  const accept = async () => {
    await setDisclaimerAccepted(true);
    setAccepted(true);
  };

  // Loading: waiting for the disclaimer check.
  if (accepted === null) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.cream50} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!accepted) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <DisclaimerScreen onAccept={accept} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Guest access: open straight into tabs. Sign-in is required only for AI document
  // analysis and Supabase-backed sync (gated at the Assistant/Settings tabs). This
  // keeps the guided assessment usable without an account, per Apple 5.1.1.
  if (!isSupabaseConfigured()) {
    console.warn(
      '[migration-assist] Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local or eas.json.'
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal800
  },
  disclaimerContent: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  kicker: {
    color: COLORS.ink700,
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8
  },
  title: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 39,
    textAlign: 'center',
    marginBottom: 20
  },
  cardTitle: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 10
  },
  body: {
    color: COLORS.ink700,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10
  }
});
