import { Stack } from 'expo-router';
import React from 'react';
import { R } from '@/constants/slurp/riso';

export default function SlurpLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: R.cream },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="broth-select" />
      <Stack.Screen name="tasting" />
      <Stack.Screen name="market" />
      <Stack.Screen name="run-summary" />
    </Stack>
  );
}
