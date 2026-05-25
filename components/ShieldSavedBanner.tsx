import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { C, F, cardShadow } from '@/constants/theme';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function ShieldSavedBanner({ visible, onDismiss }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.card} testID="shield-saved-banner">
      <View style={styles.innerBorder} />
      <TouchableOpacity
        accessibilityLabel="Dismiss streak saved banner"
        style={styles.closeBtn}
        onPress={onDismiss}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeBtnText}>×</Text>
      </TouchableOpacity>
      <View style={styles.labelRow}>
        <ShieldIcon size={13} variant="filled" />
        <Text style={styles.label}>Streak saved</Text>
      </View>
      <Text style={styles.title}>A shield kept your streak alive.</Text>
      <Text style={styles.sub}>Earn another by helping a friend or answering a challenge.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.paper,
    padding: 20,
    paddingRight: 44,
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
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closeBtnText: {
    fontFamily: F.frauncesBold,
    fontSize: 22,
    color: C.muted,
    lineHeight: 26,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.accent,
  },
  title: {
    fontFamily: F.fraunces,
    fontSize: 16,
    color: C.ink,
    lineHeight: 22,
    marginBottom: 6,
  },
  sub: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
  },
});
