import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { Card, PrimaryButton, Screen } from '../../components/ui';
import { APP_DISCLAIMER, COLORS, PRIVACY_POLICY_URL, isSupabaseConfigured } from '../../constants';
import {
  clearAIResults,
  clearResults,
  setDisclaimerAccepted
} from '../../services/storage';
import { deleteAccount } from '../../services/account';
import { supabase } from '../../services/supabase';
import {
  loadVisaCatalogFreshness,
  refreshVisaCatalogNow
} from '../../services/visaCatalog';
import { refreshMigrationNewsNow } from '../../services/migrationNews';
import type { MainTabParamList, RootStackParamList, VisaCatalogFreshness } from '../../types';

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList & RootStackParamList>>();
  const [session, setSession] = useState<Session | null>(null);
  const [freshness, setFreshness] = useState<VisaCatalogFreshness | null>(null);
  const [refreshingVisa, setRefreshingVisa] = useState(false);
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabaseReady = isSupabaseConfigured();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      supabase.auth.getSession().then(({ data }) => {
        if (!cancelled) setSession(data.session ?? null);
      });
      loadVisaCatalogFreshness().then(value => {
        if (!cancelled) setFreshness(value);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const resetDisclaimer = async () => {
    await setDisclaimerAccepted(false);
    Alert.alert('Disclaimer reset', 'Restart the app to see the disclaimer again.');
  };

  const clearLocal = () => {
    Alert.alert(
      'Clear saved assessments?',
      'This removes both guided and AI assessments saved on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([clearResults(), clearAIResults()]);
            Alert.alert('Saved assessments cleared');
          }
        }
      ]
    );
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign-out error', error.message);
      return;
    }
    navigation.navigate('Home');
  };

  const runDeleteAccount = async () => {
    setDeleting(true);
    const outcome = await deleteAccount();
    setDeleting(false);
    if (outcome.ok) {
      Alert.alert(
        'Account deleted',
        'Your account, saved assessments, and uploaded documents have been permanently removed.'
      );
      navigation.navigate('Home');
    } else {
      Alert.alert('Could not delete account', outcome.message);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, all saved AI assessments, and every document you have uploaded. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Are you absolutely sure?',
              'There is no way to recover your data after this.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete my account', style: 'destructive', onPress: runDeleteAccount }
              ]
            )
        }
      ]
    );
  };

  const refreshVisa = async () => {
    setRefreshingVisa(true);
    const outcome = await refreshVisaCatalogNow();
    setRefreshingVisa(false);
    Alert.alert(outcome.ok ? 'Visa data refreshed' : 'Refresh failed', outcome.message);
    if (outcome.ok) {
      const next = await loadVisaCatalogFreshness();
      setFreshness(next);
    }
  };

  const refreshNews = async () => {
    setRefreshingNews(true);
    const outcome = await refreshMigrationNewsNow();
    setRefreshingNews(false);
    Alert.alert(outcome.ok ? 'News refreshed' : 'News refresh failed', outcome.message);
  };

  return (
    <Screen>
      <Text style={styles.kicker}>Information</Text>
      <Text style={styles.title}>About Migration Assist</Text>

      <Card delay={80}>
        <View style={styles.row}>
          <Ionicons
            name={session ? 'person-circle' : 'person-circle-outline'}
            size={22}
            color={COLORS.indigo600}
          />
          <Text style={styles.cardTitle}>{session ? 'Signed in' : 'Not signed in'}</Text>
        </View>
        <Text style={styles.body}>
          {session
            ? `Signed in as ${session.user.email ?? 'authenticated user'}.`
            : 'You are browsing as a guest. The guided assessment works without an account; sign in to use AI document analysis.'}
        </Text>
        {!supabaseReady ? (
          <Text style={styles.warn}>
            Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local.
          </Text>
        ) : session ? (
          <>
            <PrimaryButton title="Sign out" onPress={signOut} variant="secondary" />
            <PrimaryButton
              title={deleting ? 'Deleting account...' : 'Delete account'}
              onPress={confirmDeleteAccount}
              variant="danger"
              loading={deleting}
              disabled={deleting}
              style={styles.deleteBtn}
            />
            <Text style={styles.helper}>
              Deleting your account permanently removes your profile, saved AI assessments,
              and all uploaded documents.
            </Text>
          </>
        ) : (
          <PrimaryButton
            title="Sign in or create an account"
            onPress={() => navigation.navigate('Auth')}
            variant="secondary"
          />
        )}
      </Card>

      <Card delay={160}>
        <View style={styles.row}>
          <Ionicons name="cloud-outline" size={22} color={COLORS.indigo600} />
          <Text style={styles.cardTitle}>Visa data freshness</Text>
        </View>
        <FreshnessBlock freshness={freshness} />
        {supabaseReady && (
          <View style={styles.refreshRow}>
            <PrimaryButton
              title={refreshingVisa ? 'Refreshing visa data...' : 'Refresh visa data'}
              onPress={refreshVisa}
              variant="secondary"
              loading={refreshingVisa}
              disabled={refreshingVisa}
              style={styles.refreshBtn}
            />
            <PrimaryButton
              title={refreshingNews ? 'Refreshing news...' : 'Refresh news'}
              onPress={refreshNews}
              variant="secondary"
              loading={refreshingNews}
              disabled={refreshingNews}
              style={styles.refreshBtn}
            />
          </View>
        )}
        <Text style={styles.helper}>
          Visa data and news refresh automatically on a weekly / daily schedule. Manual
          refreshes are rate-limited.
        </Text>
      </Card>

      <Card delay={240}>
        <Text style={styles.cardTitle}>Important disclaimer</Text>
        <Text style={styles.body}>{APP_DISCLAIMER}</Text>
        <Text style={styles.body}>
          For any decision about lodging a visa, speak with a registered migration agent,
          immigration lawyer, or verify directly with the Department of Home Affairs.
        </Text>
      </Card>

      <Card delay={320}>
        <Text style={styles.cardTitle}>Privacy</Text>
        <Text style={styles.body}>
          The guided assessment is saved locally on your device. AI assessments are also
          saved locally; uploaded documents are stored in your private Supabase Storage
          folder and processed by the analyze-migration Edge Function. The OpenAI / LLM
          API key never lives in the mobile app.
        </Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          activeOpacity={0.7}
          accessibilityRole="link"
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.indigo600} />
          <Text style={styles.link}>View full Privacy Policy</Text>
          <Ionicons name="open-outline" size={15} color={COLORS.indigo600} />
        </TouchableOpacity>
      </Card>

      <PrimaryButton title="Clear saved assessments" onPress={clearLocal} variant="danger" />
      <PrimaryButton title="Reset disclaimer" onPress={resetDisclaimer} variant="secondary" />
    </Screen>
  );
}

function FreshnessBlock({ freshness }: { freshness: VisaCatalogFreshness | null }) {
  if (!freshness) {
    return <Text style={styles.helper}>Loading freshness info...</Text>;
  }
  const ageDays = Math.floor(
    (Date.now() - new Date(freshness.lastFullRefreshAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1 day ago' : `${ageDays} days ago`;
  const sourceLabel =
    freshness.source === 'live'
      ? 'Live (Department of Home Affairs)'
      : freshness.source === 'ai-knowledge'
      ? 'AI training knowledge'
      : 'Bundled offline seed';
  return (
    <View style={styles.freshnessBlock}>
      <Text style={styles.freshnessTitle}>{sourceLabel}</Text>
      <Text style={styles.body}>Last refreshed {ageLabel} ({new Date(freshness.lastFullRefreshAt).toLocaleString('en-AU')}).</Text>
      {freshness.lastRefreshNotes && (
        <Text style={styles.helper}>{freshness.lastRefreshNotes}</Text>
      )}
      {freshness.nextRefreshDueAt && (
        <Text style={styles.helper}>
          Next scheduled refresh: {new Date(freshness.nextRefreshDueAt).toLocaleDateString('en-AU')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: COLORS.indigo500,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 12
  },
  title: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 30,
    marginTop: 4
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  cardTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 4
  },
  body: {
    color: COLORS.slate700,
    lineHeight: 21,
    marginBottom: 8
  },
  helper: {
    color: COLORS.slate500,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4
  },
  warn: {
    color: COLORS.amber600,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18
  },
  freshnessBlock: {
    backgroundColor: COLORS.slate100,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10
  },
  freshnessTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 14,
    marginBottom: 4
  },
  refreshRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  refreshBtn: {
    flex: 1
  },
  deleteBtn: {
    marginTop: 10
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 6
  },
  link: {
    color: COLORS.indigo600,
    fontWeight: '800',
    fontSize: 14,
    textDecorationLine: 'underline'
  }
});
