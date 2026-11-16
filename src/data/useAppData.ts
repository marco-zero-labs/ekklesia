import { useMemo } from 'react';
import { useQuery } from './DataProvider';
import type { Repository } from './repository';
import type { Person } from './types';

async function loadAll(r: Repository) {
  const [church, people, families, ministries, services, events, schedules, attendance] = await Promise.all([
    r.getChurch(),
    r.listPeople(),
    r.listFamilies(),
    r.listMinistries(),
    r.listServices(),
    r.listEvents(),
    r.listSchedules(),
    r.listAttendance(),
  ]);
  return { church, people, families, ministries, services, events, schedules, attendance };
}

export type AppData = Awaited<ReturnType<typeof loadAll>> & {
  byId: Map<string, Person>;
  name: (id: string | null | undefined) => string;
};

/** Carrega as coleções principais do repositório (as telas combinam o que precisam). */
export function useAppData() {
  const q = useQuery(loadAll);
  const data = useMemo<AppData | undefined>(() => {
    if (!q.data) return undefined;
    const byId = new Map(q.data.people.map((p) => [p.id, p]));
    return {
      ...q.data,
      byId,
      name: (id) => (id === 'publico' ? 'Ficha pública' : id ? byId.get(id)?.name ?? 'Pessoa removida' : ''),
    };
  }, [q.data]);
  return { ...q, data };
}

/** Equipe que pode ser responsável por visitantes (pastor, secretaria e quem acompanha). */
export function teamIds(people: Person[]): string[] {
  const ids = new Set(['p-josue', 'p-anapaula', 'p-thiago', 'p-raimunda']);
  for (const p of people) if (p.followUp?.responsibleId) ids.add(p.followUp.responsibleId);
  return [...ids].filter((id) => people.some((p) => p.id === id));
}

export const isVisitor = (p: Person) => !!p.followUp && p.followUp.stage !== 'membro';
