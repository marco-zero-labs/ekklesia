import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, useFonts } from '@expo-google-fonts/ibm-plex-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedbackProvider } from '@/components/Feedback';
import { DataProvider } from '@/data/DataProvider';
import { colors } from '@/theme/tokens';

/** Estilos globais da web: foco visível (2px petróleo), sem contorno no mouse, hover suave. */
function useWebGlobalStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'ekklesia-global';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      html, body, #root { height: 100%; background: ${colors.surface}; }
      body { -webkit-font-smoothing: antialiased; }
      :focus { outline: none; }
      :focus-visible { outline: 2px solid ${colors.petrol600} !important; outline-offset: 2px; border-radius: 4px; }
      input:focus-visible, textarea:focus-visible { outline-offset: 1px; }
      @media (prefers-reduced-motion: no-preference) {
        [role="button"], [role="link"], [role="tab"], a { transition: background-color .15s ease, opacity .15s ease; }
      }
    `;
    document.head.appendChild(style);
    document.documentElement.lang = 'pt-BR';
  }, []);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold });
  useWebGlobalStyles();
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DataProvider>
        <FeedbackProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
        </FeedbackProvider>
      </DataProvider>
    </SafeAreaProvider>
  );
}
