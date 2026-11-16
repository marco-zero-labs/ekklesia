import { Redirect, Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { Shell } from '@/components/Shell';
import { useSession } from '@/data/DataProvider';
import { colors } from '@/theme/tokens';

/** Área interna: exige login (simulado) e mostra o menu. */
export default function AppLayout() {
  const { session, sessionReady } = useSession();
  if (!sessionReady) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  if (!session) return <Redirect href="/entrar" />;
  return (
    <Shell>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
          animation: Platform.OS === 'web' ? 'none' : 'default',
        }}
      />
    </Shell>
  );
}
