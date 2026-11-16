import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/theme/tokens';

/** Rotas públicas (ficha do visitante, confirmação de escala, termo): sem login e sem menu. */
export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface }, animation: Platform.OS === 'web' ? 'none' : 'default' }} />;
}
