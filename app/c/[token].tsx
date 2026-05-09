import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ChallengeDeepLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <Redirect href={`/games/challenge/${token}`} />;
}
