import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';

import { CopiedToast } from '@/components/CopiedToast';
import { C, F, cardShadow } from '@/constants/theme';

export interface PredictOption {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  correct: boolean;
  predictLabel: string;
  predictOptions?: PredictOption[];
  buildChallengeUrl: (friendName: string, prediction: string) => Promise<{ url: string; token: string }>;
  onSent: (prediction: string, friendName: string, token: string) => void;
}

type Step = 'name' | 'predict' | 'share' | 'sent';

export function ChallengeModal({ visible, onClose, correct, predictLabel, predictOptions, buildChallengeUrl, onSent }: Props) {
  const [step, setStep] = useState<Step>('name');
  const [friendName, setFriendName] = useState('');
  const [prediction, setPrediction] = useState('');
  const [challengeUrl, setChallengeUrl] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const hasOptions = predictOptions && predictOptions.length > 0;
  const displayName = friendName.trim() || 'A Friend';

  const handleClose = () => {
    setStep('name');
    setFriendName('');
    setPrediction('');
    setChallengeUrl('');
    setChallengeToken('');
    setUrlCopied(false);
    setUrlLoading(false);
    setUrlError(null);
    onClose();
  };

  const handleNameNext = () => setStep('predict');

  const handlePredictNext = async () => {
    setUrlLoading(true);
    setUrlError(null);
    try {
      const { url, token } = await buildChallengeUrl(displayName, prediction);
      setChallengeUrl(url);
      setChallengeToken(token);
      setStep('share');
    } catch {
      setUrlError('Could not generate challenge link. Please try again.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    await Clipboard.setStringAsync(challengeUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({ message: `I thought this Noodle Bowl question would trick you. ${challengeUrl}` });
    markSent();
  };

  const markSent = () => {
    onSent(prediction, displayName, challengeToken);
    setStep('sent');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.box}>
          <View style={styles.innerBorder} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {step === 'name' && (
              <>
                <Text style={styles.preheader}>Who are you challenging?</Text>
                <TextInput
                  style={styles.textInput}
                  value={friendName}
                  onChangeText={setFriendName}
                  placeholder="First name (optional)"
                  placeholderTextColor={C.muted}
                  autoFocus={false}
                  returnKeyType="next"
                  onSubmitEditing={handleNameNext}
                />

                <TouchableOpacity
                  testID="challenge-name-next-btn"
                  style={styles.primaryBtn}
                  onPress={handleNameNext}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Next →</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'predict' && (
              <>
                <Text style={styles.preheader}>Before you send it —</Text>
                <Text style={styles.title}>{predictLabel}</Text>

                {hasOptions ? (
                  <View style={styles.optionsCol}>
                    {predictOptions!.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionBtn, prediction === opt.value && styles.optionBtnSelected]}
                        onPress={() => setPrediction(opt.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionBtnText, prediction === opt.value && styles.optionBtnTextSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    style={styles.textInput}
                    value={prediction}
                    onChangeText={setPrediction}
                    placeholder="Your estimate…"
                    placeholderTextColor={C.muted}
                    keyboardType="numeric"
                  />
                )}

                {urlError && <Text style={styles.errorText}>{urlError}</Text>}

                <TouchableOpacity
                  testID="challenge-next-btn"
                  style={[styles.primaryBtn, (!prediction.trim() || urlLoading) && styles.primaryBtnDisabled]}
                  onPress={handlePredictNext}
                  disabled={!prediction.trim() || urlLoading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>{urlLoading ? 'Preparing…' : 'Next →'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'share' && (
              <>
                <Text style={styles.title}>
                  {correct ? `Think ${displayName} would get this right?` : `Think ${displayName} would do better?`}
                </Text>
                <Text style={styles.subtitle}>They'll see just the question — no answers.</Text>

                <TouchableOpacity style={styles.urlBox} onPress={handleCopyUrl} activeOpacity={0.7}>
                  <Text style={styles.urlText}>{challengeUrl}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleShare} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Share with a Friend</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'sent' && (
              <>
                <Text style={styles.title}>Sent.</Text>
                <Text style={styles.subtitle}>Waiting to see what {displayName} picks…</Text>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
        <CopiedToast visible={urlCopied} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,32,48,0.6)',
    justifyContent: 'flex-end',
  },
  box: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.rule,
    maxHeight: '85%',
    ...cardShadow,
  },
  scrollContent: {
    padding: 28,
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
  preheader: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 6,
  },
  title: {
    fontFamily: F.frauncesBoldItalic,
    fontSize: 22,
    color: C.ink,
    lineHeight: 30,
    marginBottom: 20,
  },
  subtitle: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 20,
  },
  optionsCol: {
    gap: 10,
    marginBottom: 20,
  },
  optionBtn: {
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  optionBtnSelected: {
    backgroundColor: C.ink,
  },
  optionBtnText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.ink,
  },
  optionBtnTextSelected: {
    color: C.onDark,
  },
  textInput: {
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontFamily: F.mono,
    fontSize: 16,
    color: C.ink,
    marginBottom: 20,
  },
  urlBox: {
    backgroundColor: C.ink,
    padding: 14,
    marginBottom: 16,
  },
  urlText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onDark,
    letterSpacing: 0.5,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnDisabled: {
    opacity: 0.35,
  },
  primaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.onDark,
  },
  secondaryBtn: {
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.ink,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  errorText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: '#c0392b',
    marginBottom: 12,
    textAlign: 'center',
  },
});
