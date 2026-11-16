import { addDays, Day, diffDays, weekday } from '@/lib/dates';
import { plural } from '@/lib/format';
import type { Activity, AgendaEvent, Attendance, Schedule, Service } from '@/data/types';

/* ---------- Atividades: cultos recorrentes + eventos avulsos ---------- */

export const serviceActivityId = (serviceId: string, day: Day) => `${serviceId}.${day}`;

export function serviceToActivity(s: Service, day: Day): Activity {
  return {
    id: serviceActivityId(s.id, day),
    title: s.name,
    date: day,
    time: s.time,
    location: s.location,
    mode: s.mode,
    source: 'service',
    serviceId: s.id,
    ministryId: s.ministryId,
    responsibleId: s.responsibleId,
    rosterIds: s.rosterIds,
    group: s.group,
  };
}

export function eventToActivity(e: AgendaEvent): Activity {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    time: e.time,
    location: e.location,
    mode: e.mode ?? 'contagem',
    source: 'event',
    ministryId: e.ministryId,
    info: e.info,
    note: e.note,
  };
}

/** Todas as atividades de `from` até `to` (inclusive), em ordem de data e hora. */
export function activitiesBetween(services: Service[], events: AgendaEvent[], from: Day, to: Day): Activity[] {
  const out: Activity[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) {
    const day = addDays(from, i);
    const wd = weekday(day);
    for (const s of services) if (s.weekday === wd) out.push(serviceToActivity(s, day));
  }
  for (const e of events) if (e.date >= from && e.date <= to) out.push(eventToActivity(e));
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

/** Encontra uma atividade pelo id ("s-noite.2026-11-22" ou id de evento). */
export function findActivity(id: string, services: Service[], events: AgendaEvent[]): Activity | null {
  const ev = events.find((e) => e.id === id);
  if (ev) return eventToActivity(ev);
  const m = id.match(/^(.+)\.(\d{4}-\d{2}-\d{2})$/);
  if (!m) return null;
  const s = services.find((x) => x.id === m[1]);
  if (!s || weekday(m[2]) !== s.weekday) return null;
  return serviceToActivity(s, m[2]);
}

/* ---------- Situação da escala ---------- */

export type ScheduleStatus = { text: string; pending: boolean; empty: number; waiting: number; refused: number; confirmed: number; total: number };

/** "Completa", "Falta 1" (âmbar), "4 sem resposta" (âmbar). */
export function scheduleStatus(s: Schedule): ScheduleStatus {
  const total = s.slots.length;
  const empty = s.slots.filter((x) => !x.personId || x.status === 'recusou').length;
  const waiting = s.slots.filter((x) => x.personId && x.status === 'aguardando').length;
  const refused = s.slots.filter((x) => x.personId && x.status === 'recusou').length;
  const confirmed = s.slots.filter((x) => x.personId && x.status === 'confirmado').length;
  if (empty > 0) return { text: `Falta ${empty}`, pending: true, empty, waiting, refused, confirmed, total };
  if (waiting > 0) return { text: `${waiting} sem resposta`, pending: true, empty, waiting, refused, confirmed, total };
  return { text: 'Completa', pending: false, empty, waiting, refused, confirmed, total };
}

/* ---------- Frequência ---------- */

/** Série da atividade (todas as ocorrências do mesmo culto). */
export const seriesOf = (activityId: string) => activityId.replace(/\.\d{4}-\d{2}-\d{2}$/, '');

/** Média das 4 ocorrências anteriores da mesma série (null se não houver). */
export function priorAverage(records: Attendance[], rec: Pick<Attendance, 'activityId' | 'date'>, n = 4): number | null {
  const series = seriesOf(rec.activityId);
  const prior = records
    .filter((r) => r.done && seriesOf(r.activityId) === series && r.date < rec.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
  if (prior.length === 0) return null;
  return prior.reduce((sum, r) => sum + r.present, 0) / prior.length;
}

export function previousRecord(records: Attendance[], rec: Pick<Attendance, 'activityId' | 'date'>): Attendance | null {
  const series = seriesOf(rec.activityId);
  return (
    records
      .filter((r) => r.done && seriesOf(r.activityId) === series && r.date < rec.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  );
}

/** Resumo do domingo: "287 à noite · 198 de manhã · 6 visitantes". */
export function sundaySummary(records: Attendance[], sunday: Day) {
  const night = records.find((r) => r.date === sunday && seriesOf(r.activityId) === 's-noite');
  const morning = records.find((r) => r.date === sunday && seriesOf(r.activityId) === 's-manha');
  const visitors = (night?.visitors ?? 0) + (morning?.visitors ?? 0);
  return { night, morning, visitors };
}

export function summaryText(sum: ReturnType<typeof sundaySummary>): string {
  const parts: string[] = [];
  if (sum.night) parts.push(`${sum.night.present} à noite`);
  if (sum.morning) parts.push(`${sum.morning.present} de manhã`);
  parts.push(plural(sum.visitors, 'visitante', 'visitantes'));
  return parts.join(' · ');
}
