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
import { mapAuthError, resendVerificationEmail, signUp } from '@/lib/authApi';
import { useAuth } from '@/context/AuthContext';

type Phase = 'form' | 'verify';

export default function SignUpScreen() {
  const { isAnonymous, reloadUser } = useAuth();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const cameFromReveal = from === 'reveal';
  const [phase, setPhase] = useState<Phase>('form');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);

  async function handleSignUp() {
    setError(null);
    setPending(true);
    try {
      const trimmedName = displayName.trim();
      await signUp(email.trim(), password, trimmedName);
      Analytics.signedUp();
      reloadUser(trimmedName);
      setPhase('verify');
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

  async function handleResend() {
    setResendPending(true);
    try {
      await resendVerificationEmail();
      setResentAt(Date.now());
    } finally {
      setResendPending(false);
    }
  }

  if (phase === 'verify') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Masthead />

          <View style={styles.card}>
            <View style={styles.cardInnerBorder} />
            <Text style={styles.preheader}>One more step</Text>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.subtitle}>
              We've sent a verification link to{' '}
              <Text style={styles.emailHighlight}>{email.trim()}</Text>
              {'. '}
              Tap it to activate your account, then sign in.
            </Text>
            {resentAt && (
              <Text style={styles.resentLabel}>Email resent.</Text>
            )}
          </View>

          {cameFromReveal && (
            <TouchableOpacity
              testID="verify-back-to-answers-btn"
              style={styles.primaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Back to Answers</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="verify-back-to-home-btn"
            style={cameFromReveal ? styles.secondaryBtn : styles.primaryBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={cameFromReveal ? styles.secondaryBtnText : styles.primaryBtnText}>
              Back to Home
            </Text>
          </TouchableOpacity>

          {isAnonymous && (
            <TouchableOpacity
              testID="verify-signin-btn"
              style={styles.ghostBtn}
              onPress={() => router.replace('/auth/sign-in')}
              activeOpacity={0.85}
            >
              <Text style={styles.ghostBtnText}>Sign in after verifying</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="verify-resend-btn"
            style={styles.ghostBtn}
            onPress={handleResend}
            disabled={resendPending}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>
              {resendPending ? 'Sending…' : 'Resend email'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Save your streak and stats across devices.
            </Text>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How should we call you?"
              placeholderTextColor={C.muted}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={30}
            />

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
              placeholder="Min 8 characters"
              placeholderTextColor={C.muted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, pending && styles.primaryBtnDisabled]}
            onPress={handleSignUp}
            disabled={pending}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {pending ? 'Creating…' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/auth/sign-in')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Already have an account? Sign in</Text>
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
  preheader: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
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
    marginBottom: 8,
  },
  emailHighlight: {
    fontFamily: F.frauncesBold,
    color: C.ink,
  },
  resentLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.green,
    marginTop: 8,
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
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
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
