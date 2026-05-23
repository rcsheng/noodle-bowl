import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, F, cardShadow } from '@/constants/theme';
import { useGame } from '@/context/GameContext';

export function StreakCelebrationModal() {
  const { state, dismissStreakCelebration } = useGame();
  const { showStreakCelebration, weeklyStreak } = state.stats;

  return (
    <Modal visible={showStreakCelebration} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={dismissStreakCelebration} activeOpacity={1}>
        <View style={styles.card}>
          <View style={styles.innerBorder} pointerEvents="none" />
          <Text style={styles.kicker}>Weekly Streak</Text>
          <Text style={styles.streakNumber}>{weeklyStreak}</Text>
          <Text style={styles.days}>week{weeklyStreak !== 1 ? 's' : ''} in a row</Text>
          <Text style={styles.message}>Keep the streak alive — come back next week.</Text>
          <TouchableOpacity style={styles.btn} onPress={dismissStreakCelebration} activeOpacity={0.85}>
            <Text style={styles.btnText}>Keep it up!</Text>
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
  streakNumber: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 72,
    color: C.ink,
    lineHeight: 80,
    marginBottom: 4,
  },
  days: {
    fontFamily: F.frauncesItalic,
    fontSize: 20,
    color: C.muted,
    marginBottom: 20,
  },
  message: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.ink,
    textAlign: 'center',
    lineHeight: 20,
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
