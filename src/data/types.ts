import type { DateTime, Day } from '@/lib/dates';

export type ProfileKind = 'pastor' | 'secretaria' | 'lider';

export type Stage = 'primeira_visita' | 'contato_feito' | 'retornou' | 'em_integracao' | 'membro';
export const STAGES: { value: Stage; label: string }[] = [
  { value: 'primeira_visita', label: 'Primeira visita' },
  { value: 'contato_feito', label: 'Contato feito' },
  { value: 'retornou', label: 'Retornou' },
  { value: 'em_integracao', label: 'Em integração' },
  { value: 'membro', label: 'Membro' },
];
export const stageLabel = (s: Stage) => STAGES.find((x) => x.value === s)?.label ?? s;

export type ContactType = 'ligacao' | 'whatsapp' | 'visita' | 'mensagem' | 'recepcao';
export const CONTACT_TYPES: { value: Exclude<ContactType, 'recepcao'>; label: string }[] = [
  { value: 'ligacao', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'visita', label: 'Visita' },
  { value: 'mensagem', label: 'Mensagem' },
];
export const contactTypeLabel = (t: ContactType) => (t === 'recepcao' ? 'Recepção' : CONTACT_TYPES.find((x) => x.value === t)?.label ?? t);

export type ContactResult = 'conversou' | 'nao_atendeu' | 'retornou_depois';
export const CONTACT_RESULTS: { value: ContactResult; label: string }[] = [
  { value: 'conversou', label: 'Conversou' },
  { value: 'nao_atendeu', label: 'Não atendeu' },
  { value: 'retornou_depois', label: 'Retornou depois' },
];
export const contactResultLabel = (r: ContactResult) => CONTACT_RESULTS.find((x) => x.value === r)?.label ?? r;

export interface Contact {
  id: string;
  at: DateTime;
  type: ContactType;
  result?: ContactResult;
  note?: string;
  byId: string;
}

export interface StageChange {
  at: DateTime;
  from: Stage;
  to: Stage;
  byId: string;
}

export interface FollowUp {
  stage: Stage;
  firstVisit: Day;
  /** "culto de domingo à noite" */
  firstVisitService: string;
  nextContact: Day | null;
  responsibleId: string | null;
  howFound?: string;
  contacts: Contact[];
  stageHistory: StageChange[];
}

export type ConsentStatus = 'dado' | 'pendente' | 'verbal' | 'recusado';
export interface Consent {
  status: ConsentStatus;
  at?: DateTime;
  /** "ficha digital", "link pelo WhatsApp", "verbal, coletado por Ana Paula Ribeiro", "cadastro anterior ao Ekklesia" */
  via?: string;
  requestedAt?: DateTime;
}

export type PersonKind = 'membro' | 'congregado' | 'visitante';
export const PERSON_KINDS: { value: PersonKind; label: string }[] = [
  { value: 'membro', label: 'Membro' },
  { value: 'congregado', label: 'Congregado' },
  { value: 'visitante', label: 'Visitante' },
];

export interface MinistryLink {
  ministryId: string;
  /** "Diácono desde 2006", "Anfitrião", "Vocal" */
  role?: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: Day;
  address?: string;
  kind: PersonKind;
  active: boolean;
  memberSince?: Day;
  /** "Diácono", "Pastor titular" */
  title?: string;
  familyId?: string;
  familyRole?: string;
  ministries: MinistryLink[];
  /** Domingos com presença (últimas semanas). */
  presence: Day[];
  consent: Consent;
  pastoralNote?: string;
  prayerRequest?: string;
  invitedBy?: string;
  followUp?: FollowUp;
  createdAt: DateTime;
  updatedAt: DateTime;
  updatedById: string;
}

export interface Family {
  id: string;
  name: string;
}

export interface Ministry {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  roles: string[];
}

export type AttendanceMode = 'contagem' | 'chamada';

/** Culto ou célula recorrente (vira atividade na Agenda e na Frequência toda semana). */
export interface Service {
  id: string;
  name: string;
  weekday: number; // 0 = domingo
  time: string; // 'HH:mm'
  mode: AttendanceMode;
  location: string;
  kind: 'culto' | 'celula';
  responsibleId?: string;
  ministryId?: string;
  rosterIds?: string[];
  /** Nome da turma, para chamada: "Classe Jovens Adultos". */
  group?: string;
}

/** Atividade avulsa da Agenda. */
export interface AgendaEvent {
  id: string;
  title: string;
  date: Day;
  time: string;
  endTime?: string;
  location: string;
  ministryId?: string;
  note?: string;
  /** "34 de 60 inscritos" */
  info?: string;
  mode?: AttendanceMode;
  createdById: string;
}

/** Atividade concreta (culto de uma data ou evento avulso). */
export interface Activity {
  id: string;
  title: string;
  date: Day;
  time: string;
  location: string;
  mode: AttendanceMode;
  source: 'service' | 'event';
  serviceId?: string;
  ministryId?: string;
  responsibleId?: string;
  rosterIds?: string[];
  group?: string;
  info?: string;
  note?: string;
}

export type SlotStatus = 'confirmado' | 'aguardando' | 'recusou';
export interface Slot {
  id: string;
  role: string;
  personId: string | null;
  status: SlotStatus;
  message?: string;
  respondedAt?: DateTime;
}

export interface Schedule {
  id: string;
  ministryId: string;
  activityId: string;
  /** "Sáb, 21 nov · 16h00 · Templo" — guardado como data/hora/local */
  rehearsal?: { date: Day; time: string; location: string };
  /** Horário de chegada: "17:00" */
  arrival?: string;
  slots: Slot[];
}

export interface Attendance {
  id: string;
  activityId: string;
  title: string;
  date: Day;
  mode: AttendanceMode;
  present: number;
  visitors: number;
  children: number;
  presentIds?: string[];
  done: boolean;
  recordedById: string;
  recordedAt: DateTime;
}

export interface AuditEntry {
  id: string;
  at: DateTime;
  /** id da pessoa (ou 'publico' para ficha e links) */
  actorId: string;
  action: string;
  target: string;
  targetId?: string;
}

export interface Church {
  name: string;
  denomination: string;
  cep: string;
  street: string;
  number: string;
  district: string;
  city: string;
  phone: string;
  setupDone: boolean;
  setupStep: number;
}

export interface Db {
  version: 1;
  seededOn: string;
  /** Verdadeiro enquanto ninguém alterou os dados de exemplo (aí as datas acompanham o dia de hoje). */
  pristine: boolean;
  church: Church;
  people: Person[];
  families: Family[];
  ministries: Ministry[];
  services: Service[];
  events: AgendaEvent[];
  schedules: Schedule[];
  attendance: Attendance[];
  audit: AuditEntry[];
}

/** Usuários de demonstração (login simulado). */
export const USERS: Record<ProfileKind, { personId: string; label: string }> = {
  pastor: { personId: 'p-josue', label: 'Pastor' },
  secretaria: { personId: 'p-anapaula', label: 'Secretaria' },
  lider: { personId: 'p-raimunda', label: 'Líder' },
};
