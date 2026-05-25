import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

interface Props {
  visible: boolean;
  onContinue: () => void;
  onDismiss: () => void;
}

/**
 * §1b — Shield Primer
 * Fires once before the player's first "Ask a friend" or challenge tap.
 * Explains shields as gifts before they can earn one, so the earn feels meaningful.
 */
export function ShieldPrimerModal({ visible, onContinue, onDismiss }: Props) {
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
          <View style={styles.iconWrap}>
            <ShieldIcon size={48} variant="outline" />
          </View>
          <Text style={styles.heading}>When friends help each other…</Text>
          <Text style={styles.body}>
            If your friend answers your question — or you answer theirs — the helper earns a shield.
            Shields protect your weekly streak for one missed week.
          </Text>

          <View style={styles.stepList}>
            {[
              'You ask a friend for help →',
              'Friend answers your question →',
              'Friend earns a shield',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.cta} onPress={onContinue} accessibilityRole="button">
            <Text style={styles.ctaText}>OK, ask now</Text>
          </Pressable>
          <Pressable onPress={onDismiss} accessibilityRole="button" style={styles.skip}>
            <Text style={styles.skipText}>Not now</Text>
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
    gap: 14,
  },
  iconWrap: {
    marginBottom: 4,
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
  stepList: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 13,
    color: '#888',
    width: 16,
  },
  stepText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 20,
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
  skip: {
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    color: '#888',
  },
});
