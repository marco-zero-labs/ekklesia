import { describe, expect, test } from '@jest/globals';
import {
  canEditAgenda,
  canEditMinistry,
  canEditPastoralNote,
  canManageVisitors,
  canRecordAttendance,
  canSeeArea,
  canSeeAudit,
  canSeePastoralNote,
  canSeePerson,
  canSeePrayerRequest,
  canSeeVisitor,
  Viewer,
} from '../src/domain/permissions';
import { buildSeed } from '../src/data/seed';
import { unansweredStreak } from '../src/domain/followup';

const db = buildSeed('2026-11-16', new Date(2026, 10, 16, 12));
const pastor: Viewer = { profile: 'pastor', userId: 'p-josue' };
const sec: Viewer = { profile: 'secretaria', userId: 'p-anapaula' };
const lider: Viewer = { profile: 'lider', userId: 'p-raimunda' };
const person = (id: string) => db.people.find((p) => p.id === id)!;
const ministry = (id: string) => db.ministries.find((m) => m.id === id)!;

describe('permissões por perfil', () => {
  test('notas pastorais: pastor edita, secretaria vê, líder não vê', () => {
    expect([canSeePastoralNote(pastor), canEditPastoralNote(pastor)]).toEqual([true, true]);
    expect([canSeePastoralNote(sec), canEditPastoralNote(sec)]).toEqual([true, false]);
    expect([canSeePastoralNote(lider), canEditPastoralNote(lider)]).toEqual([false, false]);
  });

  test('pedido de oração: só o pastor', () => {
    expect(canSeePrayerRequest(pastor)).toBe(true);
    expect(canSeePrayerRequest(sec)).toBe(false);
    expect(canSeePrayerRequest(lider)).toBe(false);
  });

  test('visitantes: líder vê só os atribuídos a si', () => {
    expect(canSeeVisitor(lider, person('v-severino'))).toBe(true);
    expect(canSeeVisitor(lider, person('v-mariadasgracas'))).toBe(false);
    expect(canSeeVisitor(sec, person('v-mariadasgracas'))).toBe(true);
    expect(canManageVisitors(lider)).toBe(false);
    expect(canManageVisitors(sec)).toBe(true);
  });

  test('pessoas: líder vê as do próprio ministério e da célula', () => {
    expect(canSeePerson(lider, person('p-ivone'), db.ministries, db.services)).toBe(true); // Intercessão
    expect(canSeePerson(lider, person('p-benedito'), db.ministries, db.services)).toBe(true); // célula
    expect(canSeePerson(lider, person('p-gloria'), db.ministries, db.services)).toBe(false); // Coral
    expect(canSeePerson(sec, person('p-gloria'), db.ministries, db.services)).toBe(true);
  });

  test('frequência: líder registra a da própria célula', () => {
    const celula = { responsibleId: 'p-raimunda' };
    const culto = { ministryId: undefined, responsibleId: undefined };
    expect(canRecordAttendance(lider, celula, db.ministries)).toBe(true);
    expect(canRecordAttendance(lider, culto, db.ministries)).toBe(false);
    expect(canRecordAttendance(sec, culto, db.ministries)).toBe(true);
  });

  test('ministérios: líder edita só o que lidera', () => {
    const carla: Viewer = { profile: 'lider', userId: 'p-carla' };
    expect(canEditMinistry(carla, ministry('m-louvor'))).toBe(true);
    expect(canEditMinistry(carla, ministry('m-midia'))).toBe(false);
    expect(canEditMinistry(lider, ministry('m-louvor'))).toBe(false);
  });

  test('agenda e permissões', () => {
    expect(canEditAgenda(lider)).toBe(false);
    expect(canSeeArea(lider, 'agenda')).toBe(true);
    expect(canSeeAudit(lider)).toBe(false);
    expect(canSeeAudit(sec)).toBe(true);
  });
});

describe('dados de exemplo', () => {
  test('mesmos números do design', () => {
    expect(db.people).toHaveLength(538);
    expect(db.people.filter((p) => p.kind === 'membro' && p.active)).toHaveLength(412);
    const visitors = db.people.filter((p) => p.followUp && p.followUp.stage !== 'membro');
    expect(visitors).toHaveLength(24);
    expect(db.ministries).toHaveLength(9);
    expect(db.ministries.reduce((n, m) => n + m.memberIds.length, 0)).toBe(150);
  });
  test('datas relativas a hoje', () => {
    const due = (id: string) => person(id).followUp!.nextContact;
    expect(due('v-mariadasgracas')).toBe('2026-11-12'); // vencido há 4 dias
    expect(due('v-lucas')).toBe('2026-11-16'); // hoje
    const noite = db.attendance.find((a) => a.activityId === 's-noite.2026-11-15')!;
    expect(noite.present).toBe(287);
  });
  test('aniversariantes da semana: Ivone (qua), Hélio (sex), Lívia (dom)', () => {
    const week = ['11-16', '11-17', '11-18', '11-19', '11-20', '11-21', '11-22'];
    const names = db.people.filter((p) => p.active && p.birthDate && week.includes(p.birthDate.slice(5))).map((p) => `${p.name} ${p.birthDate!.slice(5)}`);
    expect(names.sort()).toEqual(['Hélio Ramos 11-20', 'Ivone Pereira 11-18', 'Lívia Souza Andrade 11-22']);
  });
  test('Maria das Graças: 3 tentativas seguidas sem resposta', () => {
    expect(unansweredStreak(person('v-mariadasgracas').followUp!.contacts)).toBe(3);
  });
});
