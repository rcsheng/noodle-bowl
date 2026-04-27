import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Masthead } from '@/components/Masthead';
import { C, F, cardShadow } from '@/constants/theme';

interface Props {
  title: string;
  body: string;
}

export function AuthGateTab({ title, body }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />
        <View style={styles.card}>
          <View style={styles.innerBorder} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/auth/sign-in')}
            testID="auth-gate-tab-signin-btn"
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/auth/sign-up')}
            testID="auth-gate-tab-create-btn"
          >
            <Text style={styles.secondaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.paper,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paperDark,
    padding: 28,
    ...cardShadow,
  },
  innerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(42,36,29,0.15)',
    pointerEvents: 'none',
  },
  preheader: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 12,
  },
  title: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    color: C.ink,
    marginBottom: 12,
  },
  body: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.muted,
    lineHeight: 24,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  primaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 13,
    color: C.onDark,
  },
  secondaryBtn: {
    padding: 8,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
});
