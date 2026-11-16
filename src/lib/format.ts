export const onlyDigits = (s: string) => s.replace(/\D/g, '');

/** Aceita "81998124407" e mostra "(81) 99812-4407"; fixo: "(81) 3427-1180". */
export function formatPhone(input: string): string {
  const d = onlyDigits(input).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (d.length === 11) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}
export function isValidPhone(input: string): boolean {
  const d = onlyDigits(input);
  return d.length === 10 || d.length === 11;
}
/** Celular tem 11 dígitos começando com 9 depois do DDD. */
export function isMobilePhone(input: string): boolean {
  const d = onlyDigits(input);
  return d.length === 11 && d[2] === '9';
}
export function samePhone(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return onlyDigits(a).slice(-10) === onlyDigits(b).slice(-10) && onlyDigits(a).length >= 10;
}
/** Link wa.me com DDI 55. */
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/55${onlyDigits(phone)}?text=${encodeURIComponent(message)}`;
}

export function formatCep(input: string): string {
  const d = onlyDigits(input).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Máscara de data dd/mm/aaaa enquanto digita. */
export function formatDateInput(input: string): string {
  const d = onlyDigits(input).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
/** Máscara de horário "19h30" a partir de "1930" ou "19:30". */
export function formatTimeInput(input: string): string {
  const d = onlyDigits(input).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}h${d.slice(2)}`;
}
/** "19h30" → "19:30"; null se inválido. */
export function parseTimeInput(input: string): string | null {
  const d = onlyDigits(input);
  if (d.length < 3) return null;
  const h = Number(d.length === 3 ? d.slice(0, 1) : d.slice(0, 2));
  const m = Number(d.slice(-2));
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Primeiro nome: "Maria das Graças Nascimento Silva" → "Maria das Graças". */
export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 3 && /^(d[aeo]s?)$/i.test(parts[1])) return parts.slice(0, 3).join(' ');
  return parts[0] ?? name;
}

/** Normaliza texto para busca: sem acento, minúsculo. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Número com separador de milhar pt-BR. */
export function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
/** Diferença com sinal tipográfico: "+2", "−10", "0". */
export function fmtDelta(n: number): string {
  const r = Math.round(n);
  if (r > 0) return `+${r}`;
  if (r < 0) return `−${-r}`;
  return '0';
}
export function fmtDecimal(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',');
}
