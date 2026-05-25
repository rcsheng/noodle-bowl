import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

interface Props {
  visible: boolean;
  weeklyStreak: number;
  shieldsRemaining: number;
  onDismiss: () => void;
}

/**
 * §1d — Shield Saved Your Streak (first time)
 * Promoted from the existing ShieldSavedBanner for the very first shield-save event.
 * Subsequent saves use the existing banner.
 */
export function ShieldSavedModal({ visible, weeklyStreak, shieldsRemaining, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible, opacity]);

  const slotVariants = Array.from({ length: 3 }, (_, i) => {
    if (i === 0) return 'gold'; // the shield that was just used
    return i < shieldsRemaining ? 'filled' : 'outline';
  }) as Array<'gold' | 'filled' | 'outline'>;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <View style={styles.card}>
          <ShieldIcon size={56} variant="gold" />
          <Text style={styles.heading}>A shield saved your streak.</Text>
          <Text style={styles.body}>
            You missed last week, but a shield kept your {weeklyStreak}-week streak alive.
            {'\n\n'}
            Earn another by helping a friend or answering a challenge.
          </Text>

          <View style={styles.slotRow}>
            {slotVariants.map((v, i) => (
              <ShieldIcon key={i} size={28} variant={v} />
            ))}
          </View>
          <Text style={styles.slotCaption}>
            {shieldsRemaining} shield{shieldsRemaining !== 1 ? 's' : ''} remaining
          </Text>

          <Pressable style={styles.cta} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.ctaText}>Keep it going</Text>
          </Pressable>
        </View>
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
    fontSize: 22,
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
