/**
 * Matriz de permissões (tela Permissões do design). Funções puras, cobertas por testes.
 *
 * Área                         Pastor   Secretaria   Líder de ministério
 * Pessoas e famílias           Editar   Editar       Ver do próprio ministério
 * Notas pastorais              Editar   Ver          Sem acesso
 * Acompanhamento de visitantes Editar   Editar       Ver os atribuídos a si
 * Frequência                   Editar   Editar       Registrar do próprio ministério
 * Ministérios e escalas        Editar   Editar       Editar o próprio ministério
 * Agenda                       Editar   Editar       Ver
 * Permissões e auditoria       Editar   Ver          Sem acesso
 * Pedido de oração (dado sensível): só o pastor.
 */
import type { Activity, Ministry, Person, ProfileKind, Schedule, Service } from '@/data/types';

export type Area = 'pessoas' | 'notas' | 'visitantes' | 'frequencia' | 'ministerios' | 'agenda' | 'permissoes';
export type Level = 'editar' | 'ver' | 'proprio' | 'nenhum';

export const AREAS: { area: Area; label: string }[] = [
  { area: 'pessoas', label: 'Pessoas e famílias' },
  { area: 'notas', label: 'Notas pastorais' },
  { area: 'visitantes', label: 'Acompanhamento de visitantes' },
  { area: 'frequencia', label: 'Frequência' },
  { area: 'ministerios', label: 'Ministérios e escalas' },
  { area: 'agenda', label: 'Agenda' },
  { area: 'permissoes', label: 'Permissões e auditoria' },
];

export const MATRIX: Record<ProfileKind, Record<Area, Level>> = {
  pastor: { pessoas: 'editar', notas: 'editar', visitantes: 'editar', frequencia: 'editar', ministerios: 'editar', agenda: 'editar', permissoes: 'editar' },
  secretaria: { pessoas: 'editar', notas: 'ver', visitantes: 'editar', frequencia: 'editar', ministerios: 'editar', agenda: 'editar', permissoes: 'ver' },
  lider: { pessoas: 'proprio', notas: 'nenhum', visitantes: 'proprio', frequencia: 'proprio', ministerios: 'proprio', agenda: 'ver', permissoes: 'nenhum' },
};

/** Texto da célula da matriz, como no design. */
export const LEVEL_TEXT: Record<Area, Partial<Record<Level, string>>> = {
  pessoas: { editar: 'Editar', proprio: 'Ver do próprio ministério' },
  notas: { editar: 'Editar', ver: 'Ver', nenhum: 'Sem acesso' },
  visitantes: { editar: 'Editar', proprio: 'Ver os atribuídos a si' },
  frequencia: { editar: 'Editar', proprio: 'Registrar do próprio ministério' },
  ministerios: { editar: 'Editar', proprio: 'Editar o próprio ministério' },
  agenda: { editar: 'Editar', ver: 'Ver' },
  permissoes: { editar: 'Editar', ver: 'Ver', nenhum: 'Sem acesso' },
};

export type Viewer = { profile: ProfileKind; userId: string };

export const level = (v: Viewer, area: Area): Level => MATRIX[v.profile][area];
export const canSeeArea = (v: Viewer, area: Area) => level(v, area) !== 'nenhum';
export const canEditArea = (v: Viewer, area: Area) => level(v, area) === 'editar';

/** Ministérios que o usuário lidera. */
export function ledMinistries(v: Viewer, ministries: Ministry[]): Ministry[] {
  return ministries.filter((m) => m.leaderId === v.userId);
}
/** Ministérios de que o usuário participa (inclui os que lidera). */
export function ownMinistries(v: Viewer, ministries: Ministry[]): Ministry[] {
  return ministries.filter((m) => m.leaderId === v.userId || m.memberIds.includes(v.userId));
}

/* ---------- Pessoas ---------- */
export function canSeePerson(v: Viewer, person: Person, ministries: Ministry[], services: Service[] = []): boolean {
  if (level(v, 'pessoas') === 'editar') return true;
  if (person.id === v.userId) return true;
  if (person.followUp?.responsibleId === v.userId) return true;
  const mine = ownMinistries(v, ministries);
  if (mine.some((m) => m.memberIds.includes(person.id))) return true;
  // célula que o líder conduz conta como o próprio ministério
  return services.some((s) => s.responsibleId === v.userId && s.rosterIds?.includes(person.id));
}
export const canEditPerson = (v: Viewer) => level(v, 'pessoas') === 'editar';

/* ---------- Notas pastorais e dados sensíveis ---------- */
export const canSeePastoralNote = (v: Viewer) => ['editar', 'ver'].includes(level(v, 'notas'));
export const canEditPastoralNote = (v: Viewer) => level(v, 'notas') === 'editar';
/** Pedido de oração: visível só para o pastor. */
export const canSeePrayerRequest = (v: Viewer) => v.profile === 'pastor';

/* ---------- Visitantes ---------- */
export function canSeeVisitor(v: Viewer, visitor: Person): boolean {
  if (level(v, 'visitantes') === 'editar') return true;
  return visitor.followUp?.responsibleId === v.userId;
}
/** O líder registra contato dos visitantes atribuídos a ele. */
export const canRegisterContact = (v: Viewer, visitor: Person) => canSeeVisitor(v, visitor);
/** Mudar etapa, responsável e cadastrar visitante: só quem edita a área. */
export const canManageVisitors = (v: Viewer) => level(v, 'visitantes') === 'editar';

/* ---------- Frequência ---------- */
export function canRecordAttendance(v: Viewer, activity: Pick<Activity, 'ministryId' | 'responsibleId'>, ministries: Ministry[]): boolean {
  if (level(v, 'frequencia') === 'editar') return true;
  if (activity.responsibleId === v.userId) return true;
  return !!activity.ministryId && ledMinistries(v, ministries).some((m) => m.id === activity.ministryId);
}

/* ---------- Ministérios e escalas ---------- */
export function canEditMinistry(v: Viewer, ministry: Ministry): boolean {
  if (level(v, 'ministerios') === 'editar') return true;
  return ministry.leaderId === v.userId;
}
export const canEditSchedule = (v: Viewer, schedule: Schedule, ministries: Ministry[]) => {
  const m = ministries.find((x) => x.id === schedule.ministryId);
  return !!m && canEditMinistry(v, m);
};

/* ---------- Agenda e permissões ---------- */
export const canEditAgenda = (v: Viewer) => level(v, 'agenda') === 'editar';
export const canSeeAudit = (v: Viewer) => canSeeArea(v, 'permissoes');
export const canEditPermissions = (v: Viewer) => level(v, 'permissoes') === 'editar';
/** Exportar listas: quem edita pessoas. */
export const canExport = (v: Viewer) => level(v, 'pessoas') === 'editar';
