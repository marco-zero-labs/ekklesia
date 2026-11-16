/**
 * Implementação local do repositório: os dados ficam no aparelho.
 * Enquanto os dados de exemplo não forem alterados, eles são recriados a cada dia,
 * para as datas continuarem relativas a hoje.
 */
import { DateTime, Day, fmtDayShort, toDateTime, todayDay } from '@/lib/dates';
import { applyContact, changeStage } from '@/domain/followup';
import { findActivity, serviceActivityId } from '@/domain/activities';
import { buildEmpty, buildSeed } from './seed';
import { storage } from './storage';
import type { ContactInput, DemoSettings, FichaInput, ImportRow, NewPersonInput, Repository, Undo } from './repository';
import type { AuditEntry, Consent, Db, Person, Schedule, Service, Stage } from './types';
import { stageLabel } from './types';

const DB_KEY = 'ekklesia.db.v1';
const DEMO_KEY = 'ekklesia.demo.v1';

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const now = (): DateTime => toDateTime(new Date());
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class DataError extends Error {}

export class LocalRepository implements Repository {
  private db: Db | null = null;
  private loading: Promise<Db> | null = null;
  private listeners = new Set<() => void>();
  private demo: DemoSettings = { slow: false, fail: false };

  /* ---------- infraestrutura ---------- */

  private async load(): Promise<Db> {
    if (this.db) {
      // dados de exemplo intactos: recria se o dia mudou (as datas acompanham hoje)
      if (this.db.pristine && this.db.seededOn !== todayDay()) await this.replace(buildSeed(todayDay()));
      return this.db!;
    }
    if (!this.loading) {
      this.loading = (async () => {
        const demoRaw = await storage.get(DEMO_KEY);
        if (demoRaw) {
          try {
            this.demo = { ...this.demo, ...(JSON.parse(demoRaw) as DemoSettings) };
          } catch {
            /* ignora */
          }
        }
        const raw = await storage.get(DB_KEY);
        let db: Db | null = null;
        if (raw) {
          try {
            db = JSON.parse(raw) as Db;
          } catch {
            db = null;
          }
        }
        if (!db || db.version !== 1 || (db.pristine && db.seededOn !== todayDay())) {
          db = buildSeed(todayDay());
          await storage.set(DB_KEY, JSON.stringify(db));
        }
        this.db = db;
        return db;
      })();
    }
    return this.loading;
  }

  /** Toda leitura passa aqui: respeita os modos de demonstração (lento / erro). */
  private async read<T>(fn: (db: Db) => T): Promise<T> {
    const db = await this.load();
    if (this.demo.slow) await sleep(1500);
    if (this.demo.fail) throw new DataError('Simulação de falha de conexão');
    return clone(fn(db));
  }

  private async persist() {
    if (this.db) await storage.set(DB_KEY, JSON.stringify(this.db));
    this.emit();
  }

  private async replace(db: Db) {
    this.db = db;
    await this.persist();
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * Aplica uma alteração, registra na auditoria e devolve o "Desfazer"
   * (restaura o estado anterior). `keepPristine` para ações que não mudam os dados (auditoria).
   */
  private async mutate(fn: (db: Db) => void, audit?: Omit<AuditEntry, 'id' | 'at'>, keepPristine = false): Promise<Undo> {
    const db = await this.load();
    if (this.demo.fail) throw new DataError('Simulação de falha de conexão');
    const before = clone(db);
    fn(db);
    if (!keepPristine) db.pristine = false;
    if (audit) db.audit.unshift({ id: uid('au'), at: now(), ...audit });
    await this.persist();
    return async () => {
      await this.replace(before);
    };
  }

  private person(db: Db, id: string): Person {
    const p = db.people.find((x) => x.id === id);
    if (!p) throw new DataError('Pessoa não encontrada');
    return p;
  }

  private schedule(db: Db, id: string): Schedule {
    const s = db.schedules.find((x) => x.id === id);
    if (!s) throw new DataError('Escala não encontrada');
    return s;
  }

  /* ---------- leitura ---------- */

  getChurch() {
    return this.read((db) => db.church);
  }
  listPeople() {
    return this.read((db) => db.people);
  }
  getPerson(id: string) {
    return this.read((db) => db.people.find((p) => p.id === id) ?? null);
  }
  listFamilies() {
    return this.read((db) => db.families);
  }
  listMinistries() {
    return this.read((db) => db.ministries);
  }
  listServices() {
    return this.read((db) => db.services);
  }
  listEvents() {
    return this.read((db) => db.events);
  }
  listSchedules() {
    return this.read((db) => db.schedules);
  }
  listAttendance() {
    return this.read((db) => db.attendance);
  }
  listAudit() {
    return this.read((db) => db.audit);
  }

  /* ---------- pessoas e visitantes ---------- */

  async createPerson(input: NewPersonInput, actorId: string) {
    const id = uid(input.kind === 'visitante' ? 'v' : 'p');
    const t = now();
    const undo = await this.mutate(
      (db) => {
        const person: Person = {
          id,
          name: input.name.trim(),
          phone: input.phone || undefined,
          email: input.email || undefined,
          birthDate: input.birthDate,
          address: input.address || undefined,
          kind: input.kind,
          active: true,
          memberSince: input.memberSince,
          familyId: input.familyId,
          familyRole: input.familyRole,
          ministries: (input.ministryIds ?? []).map((ministryId) => ({ ministryId })),
          presence: input.visitor ? [input.visitor.firstVisit] : [],
          consent: input.consent,
          invitedBy: input.invitedBy || undefined,
          prayerRequest: input.prayerRequest || undefined,
          pastoralNote: input.pastoralNote || undefined,
          createdAt: t,
          updatedAt: t,
          updatedById: actorId,
        };
        if (input.visitor) {
          person.followUp = {
            stage: 'primeira_visita',
            firstVisit: input.visitor.firstVisit,
            firstVisitService: input.visitor.firstVisitService,
            nextContact: todayDay(),
            responsibleId: input.visitor.responsibleId,
            howFound: input.visitor.howFound,
            contacts: [
              {
                id: uid('c'),
                at: t,
                type: 'recepcao',
                byId: actorId,
                note: `Cadastrado pela secretaria. 1ª visita no ${input.visitor.firstVisitService}.${input.invitedBy ? ` Convite de ${input.invitedBy}.` : ''}`,
              },
            ],
            stageHistory: [],
          };
        }
        for (const mid of input.ministryIds ?? []) db.ministries.find((m) => m.id === mid)?.memberIds.push(id);
        db.people.push(person);
      },
      { actorId, action: input.kind === 'visitante' ? 'Cadastrou visitante' : 'Cadastrou pessoa', target: input.name.trim(), targetId: id },
    );
    return { id, undo };
  }

  async updatePerson(id: string, patch: Partial<Person>, actorId: string, action: string) {
    let name = '';
    const undo = await this.mutate(
      (db) => {
        const p = this.person(db, id);
        name = patch.name ?? p.name;
        const prevMinistries = p.ministries.map((m) => m.ministryId);
        Object.assign(p, patch, { updatedAt: now(), updatedById: actorId });
        if (patch.ministries) {
          const next = patch.ministries.map((m) => m.ministryId);
          for (const m of db.ministries) {
            const had = prevMinistries.includes(m.id);
            const has = next.includes(m.id);
            if (had && !has) m.memberIds = m.memberIds.filter((x) => x !== id);
            if (!had && has) m.memberIds.push(id);
          }
        }
      },
      { actorId, action, target: '', targetId: id },
    );
    await this.fixAuditTarget(name);
    return undo;
  }

  async registerContact(personId: string, input: ContactInput, actorId: string) {
    let stageChanged: Stage | null = null;
    let name = '';
    const undo = await this.mutate(
      (db) => {
        const p = this.person(db, personId);
        name = p.name;
        if (!p.followUp) throw new DataError('Esta pessoa não está em acompanhamento');
        const r = applyContact(p.followUp, { id: uid('c'), at: now(), type: input.type, result: input.result, note: input.note?.trim() || undefined, byId: actorId }, input.nextContact);
        p.followUp = r.followUp;
        stageChanged = r.stageChanged;
        p.updatedAt = now();
        p.updatedById = actorId;
      },
      { actorId, action: 'Registrou contato', target: '', targetId: personId },
    );
    await this.fixAuditTarget(name);
    return { stageChanged, undo };
  }

  private async fixAuditTarget(target: string) {
    const db = await this.load();
    if (db.audit[0] && !db.audit[0].target) {
      db.audit[0].target = target;
      await this.persist();
    }
  }

  async setStage(personId: string, stage: Stage, actorId: string) {
    let name = '';
    const undo = await this.mutate(
      (db) => {
        const p = this.person(db, personId);
        name = p.name;
        if (!p.followUp) throw new DataError('Esta pessoa não está em acompanhamento');
        p.followUp = changeStage(p.followUp, stage, actorId, now());
        if (stage === 'membro') {
          p.kind = 'membro';
          p.memberSince = todayDay();
        } else if (p.kind === 'membro' && p.followUp) {
          p.kind = 'visitante';
          p.memberSince = undefined;
        }
      },
      { actorId, action: `Mudou etapa para ${stageLabel(stage)}`, target: '', targetId: personId },
    );
    await this.fixAuditTarget(name);
    return undo;
  }

  async setResponsible(personId: string, responsibleId: string | null, actorId: string) {
    let name = '';
    const undo = await this.mutate(
      (db) => {
        const p = this.person(db, personId);
        name = p.name;
        if (p.followUp) p.followUp.responsibleId = responsibleId;
      },
      { actorId, action: 'Atribuiu responsável', target: '', targetId: personId },
    );
    await this.fixAuditTarget(name);
    return undo;
  }

  async setConsent(personId: string, consent: Consent, actorId: string) {
    let name = '';
    const undo = await this.mutate(
      (db) => {
        const p = this.person(db, personId);
        name = p.name;
        p.consent = consent;
      },
      { actorId, action: consent.status === 'dado' ? 'Registrou consentimento' : consent.status === 'recusado' ? 'Registrou recusa de consentimento' : 'Alterou consentimento', target: '', targetId: personId },
    );
    await this.fixAuditTarget(name);
    return undo;
  }

  async requestConsent(personId: string, actorId: string) {
    let name = '';
    const undo = await this.mutate(
      (db) => {
        const p = this.person(db, personId);
        name = p.name;
        p.consent = { ...p.consent, requestedAt: now() };
      },
      { actorId, action: 'Pediu consentimento', target: '', targetId: personId },
    );
    await this.fixAuditTarget(name);
    return undo;
  }

  async submitFicha(input: FichaInput) {
    const id = uid('v');
    const t = now();
    const today = todayDay();
    await this.mutate(
      (db) => {
        db.people.push({
          id,
          name: input.name.trim(),
          phone: input.phone,
          kind: 'visitante',
          active: true,
          ministries: [],
          presence: [today],
          consent: { status: 'dado', at: t, via: 'ficha digital' },
          invitedBy: input.invitedBy?.trim() || undefined,
          prayerRequest: input.prayerRequest?.trim() || undefined,
          createdAt: t,
          updatedAt: t,
          updatedById: 'publico',
          followUp: {
            stage: 'primeira_visita',
            firstVisit: today,
            firstVisitService: 'culto',
            nextContact: today,
            responsibleId: null,
            howFound: input.howFound,
            contacts: [
              {
                id: uid('c'),
                at: t,
                type: 'recepcao',
                byId: 'publico',
                note: `Ficha de visitante preenchida pelo QR code.${input.invitedBy ? ` Convite de ${input.invitedBy.trim()}.` : ''}`,
              },
            ],
            stageHistory: [],
          },
        });
      },
      { actorId: 'publico', action: 'Enviou ficha de visitante', target: input.name.trim(), targetId: id },
    );
    return { id };
  }

  /* ---------- frequência ---------- */

  saveCount(input: { activityId: string; title: string; date: Day; present: number; visitors: number; children: number }, actorId: string) {
    return this.mutate(
      (db) => {
        const existing = db.attendance.find((a) => a.activityId === input.activityId);
        const rec = { ...input, mode: 'contagem' as const, done: true, recordedById: actorId, recordedAt: now() };
        if (existing) Object.assign(existing, rec);
        else db.attendance.unshift({ id: uid('a'), ...rec });
        db.attendance.sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt));
      },
      { actorId, action: 'Registrou contagem', target: `${input.title}, ${fmtDayShort(input.date).toLowerCase()}`, targetId: input.activityId },
    );
  }

  saveChamada(input: { activityId: string; title: string; date: Day; presentIds: string[]; done: boolean }, actorId: string) {
    return this.mutate(
      (db) => {
        const existing = db.attendance.find((a) => a.activityId === input.activityId);
        const today = input.date;
        // presença individual: entra no histórico de domingos de cada pessoa
        for (const pid of input.presentIds) {
          const p = db.people.find((x) => x.id === pid);
          if (p && !p.presence.includes(today)) p.presence = [...p.presence, today].sort();
        }
        const rec = {
          activityId: input.activityId,
          title: input.title,
          date: input.date,
          mode: 'chamada' as const,
          present: input.presentIds.length,
          visitors: db.people.filter((p) => input.presentIds.includes(p.id) && p.kind === 'visitante').length,
          children: 0,
          presentIds: input.presentIds,
          done: input.done,
          recordedById: actorId,
          recordedAt: now(),
        };
        if (existing) Object.assign(existing, rec);
        else db.attendance.unshift({ id: uid('a'), ...rec });
        db.attendance.sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt));
      },
      input.done ? { actorId, action: 'Concluiu chamada', target: `${input.title}, ${fmtDayShort(input.date).toLowerCase()}`, targetId: input.activityId } : undefined,
    );
  }

  /* ---------- escalas ---------- */

  async ensureSchedule(ministryId: string, activityId: string, actorId: string) {
    const db = await this.load();
    const found = db.schedules.find((s) => s.ministryId === ministryId && s.activityId === activityId);
    if (found) return clone(found);
    const m = db.ministries.find((x) => x.id === ministryId);
    const schedule: Schedule = {
      id: uid('esc'),
      ministryId,
      activityId,
      slots: (m?.roles.length ? m.roles : ['Equipe']).map((role) => ({ id: uid('x'), role, personId: null, status: 'aguardando' as const })),
    };
    await this.mutate((d) => {
      d.schedules.push(schedule);
    }, { actorId, action: 'Criou escala', target: `${m?.name ?? ''} · ${activityId}` });
    return clone(schedule);
  }

  assignSlot(scheduleId: string, slotId: string, personId: string, actorId: string) {
    return this.mutate(
      (db) => {
        const s = this.schedule(db, scheduleId);
        const slot = s.slots.find((x) => x.id === slotId);
        if (!slot) throw new DataError('Função não encontrada');
        slot.personId = personId;
        slot.status = 'aguardando';
        slot.message = undefined;
        slot.respondedAt = undefined;
        // novo link para a nova pessoa
        slot.id = uid('x');
      },
      { actorId, action: 'Alterou escala', target: this.scheduleTitleSync(scheduleId), targetId: scheduleId },
    );
  }

  clearSlot(scheduleId: string, slotId: string, actorId: string) {
    return this.mutate(
      (db) => {
        const slot = this.schedule(db, scheduleId).slots.find((x) => x.id === slotId);
        if (!slot) throw new DataError('Função não encontrada');
        slot.personId = null;
        slot.status = 'aguardando';
        slot.message = undefined;
        slot.respondedAt = undefined;
      },
      { actorId, action: 'Removeu da escala', target: this.scheduleTitleSync(scheduleId), targetId: scheduleId },
    );
  }

  addSlot(scheduleId: string, role: string, actorId: string) {
    return this.mutate(
      (db) => {
        this.schedule(db, scheduleId).slots.push({ id: uid('x'), role, personId: null, status: 'aguardando' });
      },
      { actorId, action: 'Alterou escala', target: this.scheduleTitleSync(scheduleId), targetId: scheduleId },
    );
  }

  async sendReminder(scheduleId: string, actorId: string) {
    const db = await this.load();
    const n = this.schedule(db, scheduleId).slots.filter((s) => s.personId && s.status === 'aguardando').length;
    await this.mutate(() => {}, { actorId, action: 'Enviou lembrete de escala', target: `${this.scheduleTitleSync(scheduleId)} · ${n} ${n === 1 ? 'pessoa' : 'pessoas'}`, targetId: scheduleId }, true);
    return n;
  }

  async respondSlot(slotId: string, response: 'confirmado' | 'recusou' | 'aguardando', message?: string) {
    await this.mutate(
      (db) => {
        for (const s of db.schedules) {
          const slot = s.slots.find((x) => x.id === slotId);
          if (slot) {
            slot.status = response;
            if (message !== undefined) slot.message = message.trim() || undefined;
            slot.respondedAt = response === 'aguardando' ? undefined : now();
            return;
          }
        }
        throw new DataError('Link de escala inválido ou expirado');
      },
      {
        actorId: 'publico',
        action: response === 'confirmado' ? 'Confirmou escala' : response === 'recusou' ? (message ? 'Deixou recado na escala' : 'Recusou escala') : 'Reabriu resposta da escala',
        target: this.slotTitleSync(slotId),
      },
    );
  }

  private scheduleTitleSync(scheduleId: string): string {
    const db = this.db;
    if (!db) return '';
    const s = db.schedules.find((x) => x.id === scheduleId);
    if (!s) return '';
    const m = db.ministries.find((x) => x.id === s.ministryId);
    const a = findActivity(s.activityId, db.services, db.events);
    return `${m?.name ?? ''} · ${a ? `${fmtDayShort(a.date)}, ${a.title.replace(/^Culto de domingo – /, '')}` : ''}`;
  }

  private slotTitleSync(slotId: string): string {
    const db = this.db;
    if (!db) return '';
    for (const s of db.schedules) {
      const slot = s.slots.find((x) => x.id === slotId);
      if (slot) {
        const p = db.people.find((x) => x.id === slot.personId);
        return `${p?.name ?? ''} · ${slot.role} · ${this.scheduleTitleSync(s.id)}`;
      }
    }
    return '';
  }

  /* ---------- agenda ---------- */

  async createEvent(input: Omit<import('./types').AgendaEvent, 'id' | 'createdById'>, actorId: string) {
    const id = uid('e');
    const undo = await this.mutate(
      (db) => {
        db.events.push({ ...input, id, createdById: actorId });
      },
      { actorId, action: 'Criou atividade', target: `${input.title}, ${fmtDayShort(input.date).toLowerCase()}`, targetId: id },
    );
    return { id, undo };
  }

  deleteEvent(id: string, actorId: string) {
    const ev = this.db?.events.find((e) => e.id === id);
    return this.mutate(
      (db) => {
        db.events = db.events.filter((e) => e.id !== id);
        db.schedules = db.schedules.filter((s) => s.activityId !== id);
      },
      { actorId, action: 'Removeu atividade', target: ev ? `${ev.title}, ${fmtDayShort(ev.date).toLowerCase()}` : id },
    );
  }

  /* ---------- configuração ---------- */

  updateChurch(patch: Partial<import('./types').Church>, actorId: string) {
    return this.mutate(
      (db) => {
        Object.assign(db.church, patch);
      },
      patch.setupStep !== undefined && Object.keys(patch).length <= 2 ? undefined : { actorId, action: 'Alterou dados da igreja', target: patch.name ?? 'Dados da igreja' },
    );
  }

  saveServices(services: Service[], actorId: string) {
    return this.mutate(
      (db) => {
        db.services = services;
      },
      { actorId, action: 'Alterou cultos recorrentes', target: `${services.length} cultos` },
    );
  }

  setMinistries(names: string[], actorId: string) {
    return this.mutate(
      (db) => {
        const keep = db.ministries.filter((m) => names.includes(m.name));
        const add = names
          .filter((n) => !db.ministries.some((m) => m.name === n))
          .map((name) => ({ id: uid('m'), name, leaderId: actorId, memberIds: [], roles: ['Equipe'] }));
        db.ministries = [...keep, ...add];
        for (const p of db.people) p.ministries = p.ministries.filter((l) => db.ministries.some((m) => m.id === l.ministryId));
      },
      { actorId, action: 'Alterou ministérios', target: `${names.length} ministérios` },
    );
  }

  async importPeople(rows: ImportRow[], actorId: string) {
    const t = now();
    const undo = await this.mutate(
      (db) => {
        for (const r of rows) {
          const id = uid('p');
          const m = r.ministry ? db.ministries.find((x) => x.name.toLowerCase() === r.ministry!.trim().toLowerCase()) : undefined;
          if (m) m.memberIds.push(id);
          db.people.push({
            id,
            name: r.name,
            phone: r.phone,
            email: r.email,
            birthDate: r.birthDate,
            address: r.address,
            kind: 'membro',
            active: true,
            memberSince: r.memberSince,
            ministries: m ? [{ ministryId: m.id }] : [],
            presence: [],
            consent: { status: 'pendente', via: 'importado de planilha' },
            createdAt: t,
            updatedAt: t,
            updatedById: actorId,
          });
        }
      },
      { actorId, action: 'Importou planilha', target: `${rows.length} pessoas` },
    );
    return { count: rows.length, undo };
  }

  /* ---------- auditoria ---------- */

  async logAudit(action: string, target: string, actorId: string, targetId?: string) {
    await this.mutate(() => {}, { actorId, action, target, targetId }, true);
  }

  /* ---------- demonstração ---------- */

  async resetSample() {
    await this.replace(buildSeed(todayDay()));
  }

  async startEmpty() {
    await this.replace(buildEmpty(todayDay()));
  }

  getDemo() {
    return { ...this.demo };
  }

  async setDemo(d: DemoSettings) {
    this.demo = { ...d };
    await storage.set(DEMO_KEY, JSON.stringify(this.demo));
    this.emit();
  }
}

export { serviceActivityId };
