import { Platform } from 'react-native';

/**
 * Salva um arquivo de texto: na web, baixa pelo navegador; no celular, grava no cache
 * e abre a folha de compartilhamento (salvar em Arquivos, enviar pelo WhatsApp etc.).
 */
export async function saveTextFile(name: string, content: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

/** Lê o conteúdo de um arquivo escolhido no seletor de documentos. */
export async function readPickedText(asset: { uri: string; file?: Blob }): Promise<string> {
  if (asset.file) return asset.file.text();
  if (Platform.OS === 'web') return (await fetch(asset.uri)).text();
  const { File } = await import('expo-file-system');
  return new File(asset.uri).text();
}
