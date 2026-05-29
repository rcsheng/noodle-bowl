import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { C, F, cardShadow } from '@/constants/theme';
import * as Analytics from '@/lib/analytics';
import { mapAuthError, signIn } from '@/lib/authApi';
import { useAuth } from '@/context/AuthContext';

export default function SignInScreen() {
  const { user } = useAuth();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const cameFromReveal = from === 'reveal';
  const cameFromGame = from === 'game';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // from=reveal: return to the reveal panel (AC7.13 "Back to Answers")
  // from=game:   return to the game screen so the user can complete Help/Challenge
  // default:     go to home tab
  function navigateOnSuccess() {
    if (cameFromReveal || cameFromGame) router.back();
    else router.replace('/');
  }

  async function handleSignIn() {
    setError(null);
    setPending(true);
    try {
      // Already signed in as this user (e.g. just linked credentials via sign-up).
      // Calling signInWithEmailAndPassword again fires a spurious null auth event
      // without a follow-up user event, leaving the app in anonymous state.
      if (user && !user.isAnonymous && user.email?.toLowerCase() === email.trim().toLowerCase()) {
        navigateOnSuccess();
        return;
      }
      await signIn(email.trim(), password);
      Analytics.loggedIn();
      navigateOnSuccess();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const zodErr = err as { errors: { message: string }[] };
        setError(zodErr.errors[0]?.message ?? 'Validation error.');
      } else {
        const code = (err as { code?: string }).code ?? '';
        const message = (err as { message?: string }).message ?? '';
        setError(mapAuthError(code, message));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Masthead />

          <View style={styles.card}>
            <View style={styles.cardInnerBorder} />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to restore your streak and stats.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={C.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={C.muted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              onPress={() => router.push('/auth/forgot-password')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, pending && styles.primaryBtnDisabled]}
            onPress={handleSignIn}
            disabled={pending}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {pending ? 'Signing in…' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/auth/sign-up')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>No account yet? Create one</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>Not now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 80 },
  card: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paperDark,
    padding: 24,
    marginBottom: 20,
    ...cardShadow,
  },
  cardInnerBorder: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(42,36,29,0.15)',
    pointerEvents: 'none',
  },
  title: {
    fontFamily: F.frauncesBold,
    fontSize: 22,
    color: C.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.ink,
    marginBottom: 18,
  },
  errorText: {
    fontFamily: F.fraunces,
    fontSize: 13,
    color: C.accent,
    marginTop: -8,
    marginBottom: 12,
  },
  forgotText: {
    fontFamily: F.fraunces,
    fontSize: 13,
    color: C.muted,
    textDecorationLine: 'underline',
    marginTop: -4,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryBtnText: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.ink,
    textDecorationLine: 'underline',
  },
  ghostBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
});
