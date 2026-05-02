import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_800ExtraBold,
  Fraunces_800ExtraBold_Italic,
} from '@expo-google-fonts/fraunces';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import { ContentProvider } from '@/context/ContentContext';
import { GameProvider } from '@/context/GameContext';
import { SlurpProvider } from '@/context/SlurpContext';
import { initAnalytics } from '@/lib/analytics';

initAnalytics();

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const isExpoGo = Constants.appOwnership === 'expo';

function NotificationHandler() {
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (isExpoGo) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    listenerRef.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // Future: navigate to friends tab on challenge_accepted tap
    });
    return () => listenerRef.current?.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    Fraunces_800ExtraBold,
    Fraunces_800ExtraBold_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ContentProvider>
        <GameProvider>
          <SlurpProvider>
            <NotificationHandler />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="games" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen name="slurp" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" />
          </SlurpProvider>
        </GameProvider>
      </ContentProvider>
    </AuthProvider>
  );
}
