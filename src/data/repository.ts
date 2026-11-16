/**
 * Camada de repositório. As telas só conhecem esta interface.
 * Hoje: LocalRepository (AsyncStorage no celular, localStorage na web).
 * Depois: uma implementação com Supabase, sem mexer nas telas.
 */
import type { Day } from '@/lib/dates';
import type {
  AgendaEvent,
  Attendance,
  AuditEntry,
  Church,
  Consent,
  ContactResult,
  ContactType,
  Family,
  Ministry,
  Person,
  PersonKind,
  Schedule,
  Service,
  Stage,
} from './types';

export type Undo = () => Promise<void>;

export type NewPersonInput = {
  name: string;
  phone?: string;
  email?: string;
  birthDate?: Day;
  address?: string;
  kind: PersonKind;
  memberSince?: Day;
  familyId?: string;
  familyRole?: string;
  ministryIds?: string[];
  consent: Consent;
  invitedBy?: string;
  prayerRequest?: string;
  pastoralNote?: string;
  /** Para visitantes: */
  visitor?: { firstVisit: Day; firstVisitService: string; responsibleId: string | null; howFound?: string };
};

export type ContactInput = { type: Exclude<ContactType, 'recepcao'>; result: ContactResult; note?: string; nextContact: Day | null };

export type FichaInput = {
  name: string;
  phone: string;
  howFound: string;
  invitedBy?: string;
  prayerRequest?: string;
};

export type ImportRow = { name: string; phone?: string; birthDate?: Day; address?: string; ministry?: string; memberSince?: Day; email?: string };

export type DemoSettings = { slow: boolean; fail: boolean };

export interface Repository {
  /* leitura */
  getChurch(): Promise<Church>;
  listPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | null>;
  listFamilies(): Promise<Family[]>;
  listMinistries(): Promise<Ministry[]>;
  listServices(): Promise<Service[]>;
  listEvents(): Promise<AgendaEvent[]>;
  listSchedules(): Promise<Schedule[]>;
  listAttendance(): Promise<Attendance[]>;
  listAudit(): Promise<AuditEntry[]>;

  /* pessoas e visitantes */
  createPerson(input: NewPersonInput, actorId: string): Promise<{ id: string; undo: Undo }>;
  updatePerson(id: string, patch: Partial<Person>, actorId: string, action: string): Promise<Undo>;
  registerContact(personId: string, input: ContactInput, actorId: string): Promise<{ stageChanged: Stage | null; undo: Undo }>;
  setStage(personId: string, stage: Stage, actorId: string): Promise<Undo>;
  setResponsible(personId: string, responsibleId: string | null, actorId: string): Promise<Undo>;
  setConsent(personId: string, consent: Consent, actorId: string): Promise<Undo>;
  requestConsent(personId: string, actorId: string): Promise<Undo>;
  submitFicha(input: FichaInput): Promise<{ id: string }>;

  /* frequência */
  saveCount(input: { activityId: string; title: string; date: Day; present: number; visitors: number; children: number }, actorId: string): Promise<Undo>;
  saveChamada(input: { activityId: string; title: string; date: Day; presentIds: string[]; done: boolean }, actorId: string): Promise<Undo>;

  /* ministérios e escalas */
  ensureSchedule(ministryId: string, activityId: string, actorId: string): Promise<Schedule>;
  assignSlot(scheduleId: string, slotId: string, personId: string, actorId: string): Promise<Undo>;
  clearSlot(scheduleId: string, slotId: string, actorId: string): Promise<Undo>;
  addSlot(scheduleId: string, role: string, actorId: string): Promise<Undo>;
  sendReminder(scheduleId: string, actorId: string): Promise<number>;
  respondSlot(slotId: string, response: 'confirmado' | 'recusou' | 'aguardando', message?: string): Promise<void>;

  /* agenda */
  createEvent(input: Omit<AgendaEvent, 'id' | 'createdById'>, actorId: string): Promise<{ id: string; undo: Undo }>;
  deleteEvent(id: string, actorId: string): Promise<Undo>;

  /* configuração */
  updateChurch(patch: Partial<Church>, actorId: string): Promise<Undo>;
  saveServices(services: Service[], actorId: string): Promise<Undo>;
  setMinistries(names: string[], actorId: string): Promise<Undo>;
  importPeople(rows: ImportRow[], actorId: string): Promise<{ count: number; undo: Undo }>;

  /* auditoria */
  logAudit(action: string, target: string, actorId: string, targetId?: string): Promise<void>;

  /* demonstração */
  resetSample(): Promise<void>;
  startEmpty(): Promise<void>;
  getDemo(): DemoSettings;
  setDemo(d: DemoSettings): Promise<void>;

  /** Avisa quando os dados mudam (para as telas recarregarem). */
  subscribe(fn: () => void): () => void;
}
