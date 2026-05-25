import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldIcon } from '@/components/ui/ShieldIcon';

interface Props {
  weeklyStreak: number;
  shieldsAvailable: number;
  onDismiss: () => void;
}

/**
 * §1e — At-Risk Banner
 * Shown on Sat/Sun on the home screen when the player hasn't played this week
 * and has a streak ≥ 2. Calm nudge — no countdown timer.
 * Condition check (day-of-week, played-this-week) is handled by the parent.
 */
export function StreakAtRiskBanner({ weeklyStreak, shieldsAvailable, onDismiss }: Props) {
  const hasShield = shieldsAvailable > 0;
  const shieldNote = hasShield
    ? `You have ${shieldsAvailable} shield${shieldsAvailable > 1 ? 's' : ''} — it'll auto-save if you miss this week.`
    : 'No shields left. Help a friend after playing to earn one.';

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <ShieldIcon size={20} variant={hasShield ? 'filled' : 'outline'} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.heading}>
            {weeklyStreak}-week streak at risk
          </Text>
          <Text style={styles.sub}>{shieldNote}</Text>
        </View>
        <Pressable
          onPress={onDismiss}
          style={styles.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={12}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FEF8EC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D9B5',
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  heading: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 13,
    color: '#7A5C00',
  },
  sub: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#7A5C00',
    lineHeight: 18,
  },
  dismiss: {
    paddingLeft: 4,
  },
  dismissText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    color: '#AAAAAA',
  },
});
