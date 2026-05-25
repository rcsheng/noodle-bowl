import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '@/constants/theme';
import { getIssueNumber, getTodayString } from '@/constants/utils';
import { useGame } from '@/context/GameContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

const MAX_SHIELDS = 3;

export function Masthead() {
  const issueNum = getIssueNumber();
  const today = getTodayString();
  const { state } = useGame();
  const { weeklyStreak, streakShieldsAvailable } = state.stats;
  const { isOffline } = useNetworkStatus();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const showStreak = weeklyStreak > 0 || streakShieldsAvailable > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />
      <View style={styles.inner}>
        <Text style={styles.dateStrip}>
          No. {String(issueNum).padStart(4, '0')} · {today}
        </Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Noodle </Text>
          <Text style={styles.amp}>Bowl</Text>
        </View>
        <Text style={styles.tagline}>Feed Your Curiosity</Text>

        {showStreak && (
          <Pressable
            style={styles.streakChip}
            onPress={() => setTooltipVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${weeklyStreak} week streak, ${streakShieldsAvailable} shields available. Tap for details.`}
          >
            {weeklyStreak > 0 && (
              <Text style={styles.streakNum}>🔥 {weeklyStreak}</Text>
            )}
            {/* Mini shield slot row */}
            <View style={styles.slotRow}>
              {Array.from({ length: MAX_SHIELDS }).map((_, i) => (
                <ShieldIcon
                  key={i}
                  size={14}
                  variant={i < streakShieldsAvailable ? 'filled' : 'outline'}
                />
              ))}
            </View>
          </Pressable>
        )}

        {isOffline && (
          <Text style={styles.offlineBanner}>NO INTERNET · USING SAVED CONTENT</Text>
        )}
      </View>
      <View style={styles.borderLine} />
      <View style={styles.borderLine} />

      {/* Tooltip popover */}
      <Modal
        visible={tooltipVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <Pressable
          style={styles.tooltipOverlay}
          onPress={() => setTooltipVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.tooltipCard}>
            <Text style={styles.tooltipTitle}>🔥 {weeklyStreak}-week streak</Text>
            <Text style={styles.tooltipBody}>
              Play at least one game each week to keep your streak alive.
            </Text>
            <View style={styles.tooltipDivider} />
            <View style={styles.tooltipSlotRow}>
              {Array.from({ length: MAX_SHIELDS }).map((_, i) => (
                <ShieldIcon
                  key={i}
                  size={22}
                  variant={i < streakShieldsAvailable ? 'filled' : 'outline'}
                />
              ))}
            </View>
            <Text style={styles.tooltipBody}>
              {streakShieldsAvailable === 0
                ? 'No shields — help a friend to earn one.'
                : `${streakShieldsAvailable} shield${streakShieldsAvailable > 1 ? 's' : ''} — each protects one missed week.`}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 2,
    marginBottom: 28,
  },
  borderLine: {
    height: 2,
    backgroundColor: C.rule,
    marginBottom: 2,
  },
  inner: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  dateStrip: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontFamily: F.frauncesXBoldItalic,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    color: C.ink,
  },
  amp: {
    fontFamily: F.frauncesItalic,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    color: C.accent,
  },
  tagline: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 8,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.rule,
    borderRadius: 20,
  },
  streakNum: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1,
    color: C.ink,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  offlineBanner: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.accentWarm,
    marginTop: 10,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 160,
  },
  tooltipCard: {
    backgroundColor: C.paper,
    borderRadius: 12,
    padding: 20,
    width: 260,
    gap: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tooltipTitle: {
    fontFamily: F.frauncesBold,
    fontSize: 18,
    color: C.ink,
    textAlign: 'center',
  },
  tooltipBody: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: C.rule,
    width: '100%',
  },
  tooltipSlotRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
