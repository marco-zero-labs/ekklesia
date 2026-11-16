/** Armazenamento na web: localStorage (com proteção para navegação privada ou armazenamento bloqueado). */
const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return ls()?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    memory.set(key, value);
    try {
      ls()?.setItem(key, value);
    } catch {
      /* sem espaço ou bloqueado: fica em memória nesta sessão */
    }
  },
  async remove(key: string): Promise<void> {
    memory.delete(key);
    try {
      ls()?.removeItem(key);
    } catch {
      /* ignora */
    }
  },
};
