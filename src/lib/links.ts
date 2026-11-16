import { Platform } from 'react-native';

/** Endereço publicado (GitHub Pages). No celular, os links públicos apontam para cá. */
export const PUBLIC_BASE = 'https://marco-zero-labs.github.io/ekklesia';

/** URL absoluta de uma rota pública: na web usa o endereço atual; no app, o do Pages. */
export function publicUrl(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = window.location.pathname.startsWith('/ekklesia') ? '/ekklesia' : '';
    return `${window.location.origin}${base}${path}`;
  }
  return `${PUBLIC_BASE}${path}`;
}
