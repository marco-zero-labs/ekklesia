/**
 * Datas como texto local: dia 'AAAA-MM-DD' e data-hora 'AAAA-MM-DDTHH:mm'.
 * Sem fuso: tudo é horário da igreja.
 */
export type Day = string;
export type DateTime = string;

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WD_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MON_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDay(d: Date): Day {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function toDateTime(d: Date): DateTime {
  return `${toDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function parseDay(day: Day): Date {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // meio-dia evita problemas de horário de verão
}
export function parseDateTime(dt: DateTime): Date {
  const d = parseDay(dt);
  const [hh, mm] = (dt.slice(11, 16) || '00:00').split(':').map(Number);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

export function todayDay(now: Date = new Date()): Day {
  return toDay(now);
}
export function addDays(day: Day, n: number): Day {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}
/** Número de dias de `a` até `b` (b − a). */
export function diffDays(a: Day, b: Day): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}
export function weekday(day: Day): number {
  return parseDay(day).getDay();
}
/** Segunda-feira da semana que contém `day` (semana de segunda a domingo). */
export function startOfWeek(day: Day): Day {
  const wd = weekday(day);
  return addDays(day, wd === 0 ? -6 : 1 - wd);
}
/** O último domingo antes de hoje (se hoje é domingo, o anterior: o de hoje ainda não terminou). */
export function lastSunday(today: Day): Day {
  const wd = weekday(today);
  return addDays(today, -(wd === 0 ? 7 : wd));
}
/** Próxima ocorrência do dia da semana `wd` a partir de `from` (inclusive). */
export function nextWeekday(from: Day, wd: number): Day {
  return addDays(from, (wd - weekday(from) + 7) % 7);
}

export function fmtTime(dt: DateTime | string): string {
  const t = dt.length > 5 ? dt.slice(11, 16) : dt;
  const [h, m] = t.split(':');
  return `${Number(h)}h${m}`;
}
/** "Qua, 18 nov" */
export function fmtDayShort(day: Day): string {
  const d = parseDay(day);
  return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}
/** "18 nov" */
export function fmtDayMonth(day: Day): string {
  const d = parseDay(day);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}
/** "12 mar 1961" */
export function fmtDayMonthYear(day: Day): string {
  const d = parseDay(day);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}
/** "jun 1998" */
export function fmtMonthYear(day: Day): string {
  const d = parseDay(day);
  return `${MON[d.getMonth()]} ${d.getFullYear()}`;
}
/** "Domingo, 15 nov" */
export function fmtDayLong(day: Day): string {
  const d = parseDay(day);
  return `${WD_LONG[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}
/** "16 a 22 de novembro" ou "28 de setembro a 4 de outubro" */
export function fmtWeekRange(monday: Day): string {
  const a = parseDay(monday);
  const b = parseDay(addDays(monday, 6));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} a ${b.getDate()} de ${MON_LONG[b.getMonth()]}`;
  return `${a.getDate()} de ${MON_LONG[a.getMonth()]} a ${b.getDate()} de ${MON_LONG[b.getMonth()]}`;
}
export function weekdayShort(day: Day): string {
  return WD[weekday(day)];
}
export function weekdayName(wd: number): string {
  return WD_LONG[wd];
}

/**
 * Situação de um próximo contato em relação a hoje:
 * "Vencido há 4 dias", "Vencido ontem", "Hoje", "Amanhã" ou "Qua, 18 nov".
 */
export function dueLabel(due: Day, today: Day): { text: string; overdue: boolean } {
  const n = diffDays(today, due);
  if (n < -1) return { text: `Vencido há ${-n} dias`, overdue: true };
  if (n === -1) return { text: 'Vencido ontem', overdue: true };
  if (n === 0) return { text: 'Hoje', overdue: false };
  if (n === 1) return { text: 'Amanhã', overdue: false };
  return { text: fmtDayShort(due), overdue: false };
}

/** Rótulo de quando algo aconteceu: "Hoje, 11h48", "Ontem, 21h05", "12 nov, 14h32". */
export function fmtWhen(dt: DateTime, today: Day): string {
  const day = dt.slice(0, 10);
  const n = diffDays(day, today);
  const t = fmtTime(dt);
  if (n === 0) return `Hoje, ${t}`;
  if (n === 1) return `Ontem, ${t}`;
  return `${fmtDayMonth(day)}, ${t}`;
}

/** "Hoje", "Ontem", "Amanhã" ou "Dom, 15 nov" — para datas de atividades. */
export function fmtRelativeDay(day: Day, today: Day): string {
  const n = diffDays(today, day);
  if (n === 0) return 'Hoje';
  if (n === -1) return 'Ontem';
  if (n === 1) return 'Amanhã';
  return fmtDayShort(day);
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Converte "12/03/1961" em '1961-03-12'; null se não reconhecer. */
export function parseBrDate(s: string): Day | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (m[3].length === 2) y += y > 30 ? 1900 : 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d, 12);
  if (date.getMonth() !== mo - 1) return null;
  return toDay(date);
}
export function fmtBrDate(day: Day): string {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}
