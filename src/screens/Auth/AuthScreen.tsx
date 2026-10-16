import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, PRIVACY_POLICY_URL, RADIUS, SPACING } from '../../constants';
import { supabase } from '../../services/supabase';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const showError = (msg: string) => {
    setInfoMsg(null);
    setErrorMsg(msg);
  };
  const showInfo = (msg: string) => {
    setErrorMsg(null);
    setInfoMsg(msg);
    Alert.alert('Account created', msg);
  };

  const friendlyAuthError = (raw: string): string => {
    const r = raw.toLowerCase();
    if (r.includes('invalid login credentials')) return 'Incorrect email or password.';
    if (r.includes('email not confirmed')) return 'Confirm your email — check your inbox.';
    if (r.includes('user already registered')) return 'Account exists. Sign in instead.';
    if (r.includes('password should be') || r.includes('weak password')) return raw;
    if (r.includes('rate limit') || r.includes('too many')) return 'Too many attempts. Wait a minute.';
    if (r.includes('network') || r.includes('failed to fetch')) return 'Cannot reach the server. Check your connection.';
    return raw;
  };

  const submit = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      showError('Enter your email and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showError('Enter a valid email address.');
      return;
    }
    if (isSignUp && password.length < 8) {
      showError('Use at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: trimmed, password });
        if (error) throw error;
        showInfo('Account created. If confirmation is required, check your inbox; otherwise sign in below.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password
        });
        if (error) throw error;
        if (navigation.canGoBack()) navigation.goBack();
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Authentication failed.';
      showError(friendlyAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {canGoBack && (
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Continue without signing in"
        >
          <Ionicons name="close" size={22} color={COLORS.cream50} />
        </TouchableOpacity>
      )}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardShell}>
            <LinearGradient
              colors={[...GRADIENTS.hero]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardInner}
            >
              <View style={styles.illustration}>
                <Ionicons name="airplane" size={56} color={COLORS.ink900} />
                <View style={styles.sunDot} />
              </View>

              <Text style={styles.eyebrow}>Migration Assist</Text>
              <Text style={styles.headline}>
                {isSignUp ? 'Create Your\nAccount' : 'Welcome Back\nTo Your Plan'}
              </Text>
              <Text style={styles.tagline}>
                {isSignUp
                  ? 'Sign up to unlock guided visa pathway assessments and AI document analysis.'
                  : 'Sign in to continue your Australian visa pathway assessment.'}
              </Text>

              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.ink500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={COLORS.ink500}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    maxLength={254}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.ink500} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={isSignUp ? 'Password (min. 8 characters)' : 'Password'}
                    placeholderTextColor={COLORS.ink500}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    maxLength={128}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(value => !value)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={COLORS.ink500}
                    />
                  </TouchableOpacity>
                </View>

                {errorMsg && (
                  <View style={styles.errorBox} accessibilityRole="alert">
                    <Ionicons name="alert-circle" size={16} color={COLORS.rose600} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}
                {infoMsg && !errorMsg && (
                  <Text style={styles.infoText}>{infoMsg}</Text>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={submit}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.cream50} />
                  ) : (
                    <Text style={styles.submitText}>
                      {isSignUp ? 'Create a profile' : 'Sign In'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchBtn}
                  onPress={() => setMode(isSignUp ? 'signin' : 'signup')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchText}>
                    {isSignUp ? 'Already have an account? Sign in' : 'New here? Create a profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {canGoBack && (
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.guestText}>Continue without an account</Text>
            </TouchableOpacity>
          )}

          <View style={styles.legal}>
            <Text style={styles.legalText}>
              Migration Assist is general guidance only. Not legal advice and does not replace a registered migration agent.
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} activeOpacity={0.7}>
              <Text style={styles.privacyLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.teal800 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center'
  },
  cardShell: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: COLORS.ink900,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12
  },
  cardInner: {
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center'
  },
  illustration: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative'
  },
  sunDot: {
    position: 'absolute',
    bottom: 18,
    left: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.peach200,
    opacity: 0.55,
    zIndex: -1
  },
  eyebrow: {
    color: COLORS.ink700,
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10
  },
  headline: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 12
  },
  tagline: {
    color: COLORS.ink700,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12
  },
  form: {
    width: '100%',
    gap: 12
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,244,232,0.7)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(17,20,15,0.12)',
    paddingHorizontal: 14,
    height: 50
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: COLORS.ink900,
    fontSize: 15,
    height: '100%'
  },
  eyeBtn: { padding: 4 },
  submitBtn: {
    backgroundColor: COLORS.ink900,
    borderRadius: RADIUS.full,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitText: {
    color: COLORS.cream50,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  switchBtn: {
    alignItems: 'center',
    paddingVertical: 8
  },
  switchText: {
    color: COLORS.ink700,
    fontSize: 13,
    textDecorationLine: 'underline'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.rose100,
    borderRadius: RADIUS.sm
  },
  errorText: {
    flex: 1,
    color: COLORS.rose600,
    fontSize: 12,
    fontWeight: '600'
  },
  infoText: {
    color: COLORS.mint600,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  legal: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 12
  },
  legalText: {
    color: COLORS.cream50,
    opacity: 0.78,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center'
  },
  privacyLink: {
    color: COLORS.cream50,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textDecorationLine: 'underline'
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,244,232,0.16)'
  },
  guestBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center'
  },
  guestText: {
    color: COLORS.cream50,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline'
  }
});
