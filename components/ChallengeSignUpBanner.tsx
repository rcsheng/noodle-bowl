import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { C, F, cardShadow } from '@/constants/theme';

interface Props {
  senderName: string;
  onCreateAccount: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
}

export function ChallengeSignUpBanner({ senderName, onCreateAccount, onSignIn, onDismiss }: Props) {
  return (
    <View style={styles.banner} testID="challenge-signup-banner">
      <View style={styles.innerBorder} />
      <Text style={styles.heading}>Challenge {senderName} Back</Text>
      <Text style={styles.body}>
        Create a free account to challenge {senderName} and track your scores.
      </Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={onCreateAccount}
        activeOpacity={0.85}
        testID="challenge-signup-create-btn"
      >
        <Text style={styles.primaryBtnText}>Create Account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={onSignIn}
        activeOpacity={0.85}
        testID="challenge-signup-signin-btn"
      >
        <Text style={styles.secondaryBtnText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={onDismiss}
        activeOpacity={0.85}
        testID="challenge-signup-dismiss-btn"
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
  body: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 20,
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
