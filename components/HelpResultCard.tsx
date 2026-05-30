import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { C, F, cardShadow } from '@/constants/theme';

interface Props {
  friendName: string;
  gameTitle: string;
  questionText: string;
  answerLabel: string;
  onDismiss: () => void;
  isGameCompleted?: boolean;
  onPlay?: () => void;
  askerAnswerLabel?: string;
}

export function HelpResultCard({
  friendName,
  gameTitle,
  questionText,
  answerLabel,
  onDismiss,
  isGameCompleted,
  onPlay,
  askerAnswerLabel,
}: Props) {
  return (
    <View style={styles.card} testID="help-result-card">
      <View style={styles.innerBorder} />

      <TouchableOpacity
        testID="help-result-dismiss-btn"
        style={styles.closeBtn}
        onPress={onDismiss}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeBtnText}>×</Text>
      </TouchableOpacity>

      <Text style={styles.label}>A friend answered</Text>
      <Text style={styles.title}>
        <Text style={styles.bold}>{friendName}</Text>
        {' helped you with '}
        <Text style={styles.bold}>{gameTitle}</Text>
      </Text>

      {!!questionText && (
        <View style={styles.questionBox}>
          <Text style={styles.questionText} numberOfLines={3}>{questionText}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.rowLabel}>They picked</Text>
        <Text style={styles.rowValue}>{answerLabel}</Text>
      </View>

      {!!askerAnswerLabel && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Your pick</Text>
          <Text style={styles.rowValue}>{askerAnswerLabel}</Text>
        </View>
      )}

      {isGameCompleted && (
        <Text style={styles.playedToday}>Played this week</Text>
      )}

      {!isGameCompleted && !!onPlay && (
        <TouchableOpacity
          testID="help-result-play-btn"
          style={styles.playBtn}
          onPress={onPlay}
          activeOpacity={0.85}
        >
          <Text style={styles.playBtnText}>Try this question →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: C.rule,
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
  label: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 8,
  },
  title: {
    fontFamily: F.fraunces,
    fontSize: 15,
    color: C.ink,
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontFamily: F.frauncesBold,
  },
  questionBox: {
    backgroundColor: C.paperDark,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    padding: 12,
    marginBottom: 12,
  },
  questionText: {
    fontFamily: F.frauncesItalic,
    fontSize: 14,
    color: C.ink,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.paperDarker,
    gap: 10,
  },
  rowLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    width: 110,
  },
  rowValue: {
    fontFamily: F.frauncesBold,
    fontSize: 14,
    color: C.ink,
    flex: 1,
  },
  playBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.ink,
    alignSelf: 'flex-start',
  },
  playBtnText: {
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.ink,
  },
  playedToday: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 14,
  },
});
