import { Redirect, Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSession } from '@/data/DataProvider';
import { colors } from '@/theme/tokens';

/** Configuração inicial: exige login, sem menu (como no design). */
export default function SetupLayout() {
  const { session, sessionReady } = useSession();
  if (!sessionReady) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  if (!session) return <Redirect href="/entrar" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface }, animation: Platform.OS === 'web' ? 'none' : 'default' }} />;
}
