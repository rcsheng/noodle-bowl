import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masthead } from '@/components/Masthead';
import { C, F, cardShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import { GameId } from '@/constants/data';
import { deleteAccount, mapAuthError, signOutAndGoAnonymous } from '@/lib/authApi';

const ALL_GAMES: GameId[] = ['lede', 'spread', 'sof', 'quip', 'wave'];

export default function ProfileScreen() {
  const { user, isAnonymous, displayName } = useAuth();
  const { setSeen } = useGame();

  async function handleSignOut() {
    await signOutAndGoAnonymous();
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, streak, and stats. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/');
            } catch (err: unknown) {
              const code = (err as { code?: string }).code ?? '';
              const message = (err as { message?: string }).message ?? '';
              Alert.alert('Could not delete account', mapAuthError(code, message));
            }
          },
        },
      ],
    );
  }

  function handleResetSeen() {
    Alert.alert(
      'Reset seen questions?',
      'Clears the "seen" tracker for all games so you can replay questions. Streak and stats are preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            ALL_GAMES.forEach(g => setSeen(g, []));
          },
        },
      ],
    );
  }

  function handleClearLocalData() {
    Alert.alert(
      'Clear local data?',
      'Wipes streak, friend activity, and signs you out. Server-side data is untouched. Use only for testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            await signOutAndGoAnonymous();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Masthead />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardInnerBorder} />

          {isAnonymous ? (
            <>
              <Text style={styles.anonTitle}>Playing as Guest</Text>
              <Text style={styles.anonBody}>
                Create an account to save your streak, stats, and friend activity across devices.
              </Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push('/auth/sign-up')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Create Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/auth/sign-in')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(displayName ?? user?.email ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.displayName}>
                    {displayName ?? 'No name set'}
                  </Text>
                  <Text style={styles.emailText}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.85}
              >
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDeleteAccount}
                activeOpacity={0.85}
              >
                <Text style={styles.deleteBtnText}>Delete Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {isAnonymous && (
          <View style={styles.saveBanner}>
            <Text style={styles.saveBannerText}>
              Stats and streaks are only saved on this device while playing as a guest.
            </Text>
          </View>
        )}

        {__DEV__ && (
          <>
            <TouchableOpacity
              style={[styles.debugBtn, { marginBottom: 10 }]}
              onPress={handleResetSeen}
              activeOpacity={0.85}
            >
              <Text style={styles.debugBtnText}>Reset seen questions (dev)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.debugBtn}
              onPress={handleClearLocalData}
              activeOpacity={0.85}
            >
              <Text style={styles.debugBtnText}>Clear local data (dev)</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noodle Bowl · Profile</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 80 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
    marginRight: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.paperDarker,
  },
  card: {
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.paperDark,
    padding: 24,
    marginBottom: 20,
    ...cardShadow,
  },
  cardInnerBorder: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(42,36,29,0.15)',
    pointerEvents: 'none',
  },
  anonTitle: {
    fontFamily: F.frauncesBold,
    fontSize: 18,
    color: C.ink,
    marginBottom: 8,
  },
  anonBody: {
    fontFamily: F.fraunces,
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: C.ink,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
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
    borderWidth: 1,
    borderColor: C.rule,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.ink,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: F.frauncesXBold,
    fontSize: 22,
    color: C.onDark,
    lineHeight: 28,
  },
  profileInfo: { flex: 1 },
  displayName: {
    fontFamily: F.frauncesBold,
    fontSize: 16,
    color: C.ink,
    marginBottom: 2,
  },
  emailText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: C.paperDarker,
    marginBottom: 20,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: C.rule,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.muted,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#c4453a',
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#c4453a',
  },
  saveBanner: {
    borderWidth: 1,
    borderColor: C.rule,
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 20,
  },
  saveBannerText: {
    fontFamily: F.fraunces,
    fontSize: 13,
    color: C.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  debugBtn: {
    borderWidth: 1,
    borderColor: '#c4453a',
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  debugBtnText: {
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#c4453a',
  },
  footer: { alignItems: 'center', paddingTop: 24 },
  footerText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted,
  },
});
