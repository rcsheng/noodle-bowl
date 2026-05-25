import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

interface Props {
  visible: boolean;
  giverName?: string; // name of the friend who triggered the shield (if applicable)
  onDismiss: () => void;
}

/**
 * §1c — First Shield Earned
 * Replaces the standard ShieldEarnedToast for the very first shield a player earns.
 * Uses gift framing: "Mei gave you a shield" (not "you earned one").
 */
export function FirstShieldEarnedModal({ visible, giverName, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220 }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.92);
    }
  }, [visible, opacity, scale]);

  const headline = giverName
    ? `${giverName} gave you a shield.`
    : 'You earned a shield.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <ShieldIcon size={64} variant="filled" />
          <Text style={styles.heading}>{headline}</Text>
          <Text style={styles.body}>
            It'll protect your streak for one missed week. You can hold up to 3 shields at a time.
          </Text>

          {/* 3-slot visualisation */}
          <View style={styles.slotRow}>
            <ShieldIcon size={28} variant="filled" />
            <ShieldIcon size={28} variant="outline" />
            <ShieldIcon size={28} variant="outline" />
          </View>
          <Text style={styles.slotCaption}>1 of 3 shields</Text>

          <Pressable style={styles.cta} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.ctaText}>Keep playing</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: '#FAF8F3',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  heading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  body: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
    lineHeight: 20,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  slotCaption: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  cta: {
    marginTop: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: '#FAF8F3',
    letterSpacing: 1,
  },
});
