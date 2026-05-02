import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { C, F, cardShadow } from '@/constants/theme';

interface Props {
  onCreateAccount: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
  helpSentFor?: string;
}

export function ShieldSignUpBanner({ onCreateAccount, onSignIn, onDismiss, helpSentFor }: Props) {
  return (
    <View style={styles.banner} testID="shield-signup-banner">
      <View style={styles.innerBorder} />
      {helpSentFor && (
        <>
          <Text style={styles.helpSentHeading}>Help Sent</Text>
          <Text style={styles.helpSentBody}>Your answer has been sent to {helpSentFor}.</Text>
          <View style={styles.divider} />
        </>
      )}
      <Text style={styles.heading}>🛡 Sign up to keep your shield</Text>
      <Text style={styles.body}>
        Help a friend or answer a challenge to earn a streak shield. Each shield protects your
        streak for one missed day — but you need an account to keep them.
      </Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={onCreateAccount}
        activeOpacity={0.85}
        testID="shield-signup-create-btn"
      >
        <Text style={styles.primaryBtnText}>Create Account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={onSignIn}
        activeOpacity={0.85}
        testID="shield-signup-signin-btn"
      >
        <Text style={styles.secondaryBtnText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={onDismiss}
        activeOpacity={0.85}
        testID="shield-signup-dismiss-btn"
      >
        <Text style={styles.dismissBtnText}>Maybe Later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paper,
    padding: 24,
    marginBottom: 16,
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
  heading: {
    fontFamily: F.frauncesBold,
    fontSize: 18,
    color: C.ink,
    marginBottom: 8,
  },
  helpSentHeading: {
    fontFamily: F.frauncesBold,
    fontSize: 18,
    color: C.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  helpSentBody: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: C.rule,
    marginBottom: 16,
  },
  body: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 18,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  secondaryBtn: {
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 6,
  },
  secondaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.ink,
  },
  dismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
});
