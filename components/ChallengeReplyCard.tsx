import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { C, F, cardShadow } from '@/constants/theme';

interface Props {
  friendName: string;
  gameTitle: string;
  questionText: string;
  friendAnswerLabel: string;
  correctLabel: string | null;
  friendCorrect: boolean | null;
  predictionLabel: string;
  predictionCorrect: boolean;
  onDismiss: () => void;
}

export function ChallengeReplyCard({
  friendName,
  gameTitle,
  questionText,
  friendAnswerLabel,
  correctLabel,
  friendCorrect,
  predictionLabel,
  predictionCorrect,
  onDismiss,
}: Props) {
  return (
    <View style={styles.card} testID="challenge-reply-card">
      <View style={styles.innerBorder} />

      <TouchableOpacity
        testID="challenge-reply-dismiss-btn"
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
        {' answered your '}
        <Text style={styles.bold}>{gameTitle}</Text>
        {' challenge'}
      </Text>

      {!!questionText && (
        <View style={styles.questionBox}>
          <Text style={styles.questionText} numberOfLines={3}>{questionText}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.rowLabel}>They picked</Text>
        <Text style={styles.rowValue}>{friendAnswerLabel}</Text>
      </View>

      {correctLabel !== null && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Correct answer</Text>
          <Text style={styles.rowValue}>{correctLabel}</Text>
        </View>
      )}

      {friendCorrect !== null && (
        <Text style={[styles.tag, friendCorrect ? styles.tagCorrect : styles.tagWrong]}>
          {friendCorrect ? '✓ Friend got it right' : '✗ Friend was off'}
        </Text>
      )}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Your prediction</Text>
        <Text style={styles.rowValue}>{predictionLabel}</Text>
      </View>

      <Text style={[styles.tag, predictionCorrect ? styles.tagCorrect : styles.tagWrong]}>
        {predictionCorrect ? '✓ You called it' : '✗ Off this time'}
      </Text>
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
  tag: {
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  tagCorrect: {
    color: C.green,
  },
  tagWrong: {
    color: C.accent,
  },
  divider: {
    height: 1,
    backgroundColor: C.paperDarker,
    marginTop: 14,
    marginBottom: 4,
  },
});
