import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation
} from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { Card, PrimaryButton, Screen } from '../../components/ui';
import {
  COLORS,
  isSupabaseConfigured,
  MAX_DOC_BYTES,
  MAX_PASTED_TEXT_CHARS
} from '../../constants';
import { runAIAssessment, type PickedDocument } from '../../services/aiAssessment';
import { supabase } from '../../services/supabase';
import type { MainTabParamList, RootStackParamList } from '../../types';

const ACCEPTED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];

export default function AssistantScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList & RootStackParamList>>();
  const [session, setSession] = useState<Session | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [documents, setDocuments] = useState<PickedDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      supabase.auth.getSession().then(({ data }) => {
        if (!cancelled) setSession(data.session ?? null);
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

  const supabaseReady = isSupabaseConfigured();

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_MIME,
        multiple: false,
        copyToCacheDirectory: true
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0]!;
      if (asset.size != null && asset.size > MAX_DOC_BYTES) {
        Alert.alert(
          'File too large',
          `Please pick a file under ${(MAX_DOC_BYTES / 1024 / 1024).toFixed(0)} MB.`
        );
        return;
      }
      setDocuments(prev => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.name,
          size: asset.size ?? null,
          mimeType: asset.mimeType ?? null
        }
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not open the file picker.';
      Alert.alert('Picker error', msg);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, idx) => idx !== index));
  };

  const submit = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    let outcome;
    try {
      outcome = await runAIAssessment({ pastedText, documents });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error.';
      setSubmitting(false);
      setErrorMsg(msg);
      Alert.alert('Could not analyze', msg);
      return;
    }
    setSubmitting(false);

    if (!outcome.ok) {
      if (outcome.reason === 'NOT_SIGNED_IN') {
        Alert.alert('Sign in required', outcome.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => navigation.navigate('Auth') }
        ]);
        return;
      }
      setErrorMsg(outcome.message);
      Alert.alert('Could not analyze', outcome.message);
      return;
    }

    setPastedText('');
    setDocuments([]);
    navigation.navigate('AIResults', { resultId: outcome.result.id });
  };

  return (
    <Screen>
      <View>
        <Text style={styles.kicker}>AI assistant</Text>
        <Text style={styles.title}>Describe your situation</Text>
        <Text style={styles.subtitle}>
          Paste a few sentences about your background and goals, or attach a document. The
          AI assistant returns a plain-English summary of the visa pathways that may fit,
          gaps to fix, and next steps to take.
        </Text>
      </View>

      {!supabaseReady && (
        <Card style={styles.warnCard}>
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={20} color={COLORS.amber600} />
            <Text style={styles.warnTitle}>Supabase not configured</Text>
          </View>
          <Text style={styles.warnBody}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local
            and restart Expo.
          </Text>
        </Card>
      )}

      {supabaseReady && !session && (
        <Card style={styles.signInCard}>
          <View style={styles.row}>
            <Ionicons name="lock-closed" size={20} color={COLORS.indigo600} />
            <Text style={styles.signInTitle}>Sign in to use AI analysis</Text>
          </View>
          <Text style={styles.signInBody}>
            The AI assistant uploads documents to your private, encrypted folder, so it
            needs an account. The guided assessment works without signing in.
          </Text>
          <PrimaryButton
            title="Sign in or create an account"
            onPress={() => navigation.navigate('Auth')}
          />
        </Card>
      )}


      <Card delay={80}>
        <Text style={styles.sectionTitle}>Your situation</Text>
        <Text style={styles.helper}>
          For example: nationality, age, current visa, occupation, qualifications,
          English level, family ties, study or work plans.
        </Text>
        <TextInput
          value={pastedText}
          onChangeText={setPastedText}
          placeholder="Type or paste a short paragraph here..."
          placeholderTextColor={COLORS.slate500}
          style={styles.textarea}
          multiline
          textAlignVertical="top"
          maxLength={MAX_PASTED_TEXT_CHARS}
        />
        <Text style={styles.counter}>
          {pastedText.length.toLocaleString()} / {MAX_PASTED_TEXT_CHARS.toLocaleString()}
        </Text>
      </Card>

      <Card delay={180}>
        <Text style={styles.sectionTitle}>Supporting documents (optional)</Text>
        <Text style={styles.helper}>
          PDF, PNG, JPEG, or plain text up to {(MAX_DOC_BYTES / 1024 / 1024).toFixed(0)} MB
          each. Documents are uploaded to your private Supabase folder and processed
          server-side.
        </Text>
        {documents.map((doc, idx) => (
          <View key={`${doc.uri}-${idx}`} style={styles.docRow}>
            <Ionicons name="document-attach-outline" size={18} color={COLORS.indigo600} />
            <Text style={styles.docName} numberOfLines={1}>
              {doc.name}
            </Text>
            <TouchableOpacity onPress={() => removeDocument(idx)} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={COLORS.rose600} />
            </TouchableOpacity>
          </View>
        ))}
        <PrimaryButton
          title={documents.length ? 'Add another document' : 'Attach a document'}
          variant="secondary"
          onPress={pickDocument}
        />
      </Card>

      <PrimaryButton
        title="Analyze my situation"
        onPress={submit}
        loading={submitting}
        disabled={submitting || !supabaseReady}
      />

      {errorMsg && (
        <Card style={styles.errorCard}>
          <View style={styles.row}>
            <Ionicons name="warning" size={20} color={COLORS.rose600} />
            <Text style={styles.errorTitle}>Could not analyze</Text>
          </View>
          <Text style={styles.errorBody}>{errorMsg}</Text>
        </Card>
      )}

      <Text style={styles.disclaimer}>
        Migration Assist is general guidance only. It does not lodge applications and is
        not a substitute for advice from a registered migration agent or immigration
        lawyer.
      </Text>
    </Screen>
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
  subtitle: {
    color: COLORS.slate600,
    marginTop: 8,
    lineHeight: 21
  },
  warnCard: {
    gap: 8
  },
  signInCard: {
    gap: 10,
    borderColor: COLORS.indigo100,
    borderWidth: 1.5
  },
  signInTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 16
  },
  signInBody: {
    color: COLORS.slate600,
    lineHeight: 20
  },
  warnTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 16
  },
  warnBody: {
    color: COLORS.slate700,
    lineHeight: 20
  },
  errorCard: {
    gap: 6,
    backgroundColor: COLORS.rose100,
    borderColor: COLORS.rose100
  },
  errorTitle: {
    color: COLORS.rose600,
    fontWeight: '900',
    fontSize: 16
  },
  errorBody: {
    color: COLORS.slate900,
    lineHeight: 20
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  gap: {
    marginTop: 12
  },
  sectionTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 6
  },
  helper: {
    color: COLORS.slate500,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18
  },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 14,
    padding: 12,
    color: COLORS.slate900,
    backgroundColor: COLORS.white
  },
  counter: {
    color: COLORS.slate500,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.indigo100,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10
  },
  docName: {
    flex: 1,
    color: COLORS.slate900,
    fontWeight: '700'
  },
  disclaimer: {
    color: COLORS.slate400,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center'
  }
});
