import { Redirect, useLocalSearchParams } from 'expo-router';

export default function HelpDeepLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <Redirect href={`/games/help/${token}`} />;
}
