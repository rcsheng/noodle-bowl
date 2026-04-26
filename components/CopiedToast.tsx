import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { C, F } from '@/constants/theme';

export function CopiedToast({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.wrapper, { opacity }]} pointerEvents="none">
      <View style={styles.toast}>
        <Text style={styles.text}>Copied!</Text>
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
    backgroundColor: C.ink,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  text: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.onDark,
  },
});
