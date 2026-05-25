import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { C, F } from '@/constants/theme';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

// Animated.Text is needed to animate the text alongside the container.
const AnimatedText = Animated.Text;

interface Props {
  visible: boolean;
  /** When true the toast is suppressed — the caller shows FirstShieldEarnedModal instead. */
  suppressed?: boolean;
}

export function ShieldEarnedToast({ visible, suppressed = false }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !suppressed) {
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, suppressed, opacity]);

  if (suppressed) return null;

  return (
    <Animated.View style={[styles.wrapper, { opacity }]} pointerEvents="none">
      <View style={styles.toast}>
        <ShieldIcon size={14} variant="filled" />
        <AnimatedText style={styles.text}>Shield earned</AnimatedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.ink,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.accent,
  },
  text: {
    fontFamily: F.monoBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.onDark,
  },
});
