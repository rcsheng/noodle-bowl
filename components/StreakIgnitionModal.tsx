import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

interface Props {
  visible: boolean;
  weeklyStreak: number;
  onDismiss: () => void;
}

/**
 * §1a — Streak Ignition
 * Fires once after the player completes their first week of play.
 * Introduces the weekly streak concept before they have anything to lose.
 */
export function StreakIgnitionModal({ visible, weeklyStreak, onDismiss }: Props) {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <View style={styles.card}>
          <Text style={styles.label}>WEEK {weeklyStreak}</Text>
          <Text style={styles.fire}>🔥</Text>
          <Text style={styles.heading}>Your streak has started.</Text>
          <Text style={styles.body}>
            Play at least one game each week to keep it alive. Friends can give you shields — they're
            your only protection if you miss a week.
          </Text>

          <View style={styles.shieldRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.slotWrap}>
                <ShieldIcon size={28} variant="outline" />
              </View>
            ))}
          </View>
          <Text style={styles.slotCaption}>3 shield slots — earn them by helping friends</Text>

          <Pressable style={styles.cta} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.ctaText}>Got it</Text>
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
  label: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    letterSpacing: 2,
    color: '#888',
  },
  fire: {
    fontSize: 44,
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
  shieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  slotWrap: {
    opacity: 0.4,
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
