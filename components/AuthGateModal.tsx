import { router } from 'expo-router';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { C, F, cardShadow } from '@/constants/theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function AuthGateModal({ visible, onDismiss }: Props) {
  const handleSignIn = () => {
    onDismiss();
    router.push('/auth/sign-in?from=game');
  };

  const handleCreateAccount = () => {
    onDismiss();
    router.push('/auth/sign-up?from=game');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.innerBorder} />
          <View style={styles.content}>
            <Text style={styles.title}>Login to share with friends</Text>
            <Text style={styles.body}>
              Challenge friends, ask for help, and track your stats across devices.
            </Text>

            <TouchableOpacity
              testID="auth-gate-signin-btn"
              style={styles.primaryBtn}
              onPress={handleSignIn}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="auth-gate-create-btn"
              style={styles.secondaryBtn}
              onPress={handleCreateAccount}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="auth-gate-dismiss-btn"
              style={styles.closeBtn}
              onPress={onDismiss}
              activeOpacity={0.85}
            >
              <Text style={styles.closeBtnText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,32,48,0.6)',
    justifyContent: 'flex-end',
  },
  box: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.rule,
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
  content: {
    padding: 28,
  },
  title: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    color: C.ink,
    lineHeight: 30,
    marginBottom: 10,
  },
  body: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 24,
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
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryBtnText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.ink,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
});
