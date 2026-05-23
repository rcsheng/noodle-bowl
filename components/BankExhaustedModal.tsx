import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, F, cardShadow } from '@/constants/theme';

interface BankExhaustedModalProps {
  visible: boolean;
  gameName: string;
  onDismiss: () => void;
}

export function BankExhaustedModal({ visible, gameName, onDismiss }: BankExhaustedModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={onDismiss} activeOpacity={1}>
        <View style={styles.card}>
          <View style={styles.innerBorder} pointerEvents="none" />
          <Text style={styles.kicker}>All done today</Text>
          <Text style={styles.gameName}>{gameName}</Text>
          <Text style={styles.message}>
            You've played every question available.{'\n'}New questions arrive next Monday.
          </Text>
          {/* TODO: upsell CTA — "Unlock the full question bank" */}
          <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.btnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,32,48,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.rule,
    padding: 32,
    alignItems: 'center',
    width: '100%',
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
  kicker: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 12,
  },
  gameName: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 36,
    color: C.ink,
    lineHeight: 44,
    marginBottom: 16,
  },
  message: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.ink,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: C.ink,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  btnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.onDark,
  },
});
