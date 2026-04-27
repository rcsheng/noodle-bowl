import { router } from 'expo-router';
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
import { sendPasswordReset } from '@/lib/authApi';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSend() {
    setError(null);
    setPending(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const zodErr = err as { errors: { message: string }[] };
        setError(zodErr.errors[0]?.message ?? 'Validation error.');
      } else {
        setError('Could not send reset email. Check the address and try again.');
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
            {sent ? (
              <>
                <Text style={styles.title}>Check your inbox</Text>
                <Text style={styles.subtitle}>
                  We sent a password reset link to {email}. It may take a minute to arrive.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we'll send a reset link.
                </Text>

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
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                />

                {error && <Text style={styles.errorText}>{error}</Text>}
              </>
            )}
          </View>

          {sent ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/auth/sign-in')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, pending && styles.primaryBtnDisabled]}
              onPress={handleSend}
              disabled={pending}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {pending ? 'Sending…' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>Back</Text>
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
