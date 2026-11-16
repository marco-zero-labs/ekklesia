import { describe, expect, test } from '@jest/globals';
import { applyContact, changeStage, StageError, suggestNextContact, unansweredStreak, visitSuggestion, whatsappMessage, defaultTemplate } from '../src/domain/followup';
import { addAndMark, faltam, markPresent, presentes, unmark } from '../src/domain/chamada';
import type { Contact, FollowUp } from '../src/data/types';

const c = (at: string, result?: Contact['result'], type: Contact['type'] = 'ligacao'): Contact => ({ id: at, at, type, result, byId: 'p-thiago' });

const fu = (contacts: Contact[], stage: FollowUp['stage'] = 'contato_feito'): FollowUp => ({
  stage,
  firstVisit: '2026-10-25',
  firstVisitService: 'culto de domingo à noite',
  nextContact: '2026-11-12',
  responsibleId: 'p-thiago',
  contacts,
  stageHistory: [],
});

describe('próximo contato sugerido', () => {
  test('não atendeu: +2 dias', () => {
    expect(suggestNextContact('nao_atendeu', '2026-11-16')).toEqual({ day: '2026-11-18', days: 2, reason: 'porque não atendeu' });
  });
  test('conversou: +7 dias', () => {
    expect(suggestNextContact('conversou', '2026-11-16')).toEqual({ day: '2026-11-23', days: 7, reason: 'porque conversou' });
  });
  test('retornou depois: +7 dias', () => {
    expect(suggestNextContact('retornou_depois', '2026-11-16').day).toBe('2026-11-23');
  });
});

describe('sugestão de visita', () => {
  const tres = [c('2026-10-25T20:00', undefined, 'recepcao'), c('2026-10-28T18:00', 'conversou'), c('2026-11-01T19:00', 'nao_atendeu'), c('2026-11-04T19:00', 'nao_atendeu'), c('2026-11-09T19:00', 'nao_atendeu')];

  test('conta só as tentativas seguidas sem resposta (a ficha da recepção não conta)', () => {
    expect(unansweredStreak(tres)).toBe(3);
    expect(unansweredStreak([...tres, c('2026-11-10T19:00', 'conversou')])).toBe(0);
  });
  test('a 4ª tentativa sem resposta sugere visita', () => {
    expect(visitSuggestion(tres, 'ligacao', 'nao_atendeu')).toBe(4);
  });
  test('não sugere com resposta, na 3ª tentativa ou se já é visita', () => {
    expect(visitSuggestion(tres, 'ligacao', 'conversou')).toBeNull();
    expect(visitSuggestion(tres.slice(0, 4), 'ligacao', 'nao_atendeu')).toBeNull();
    expect(visitSuggestion(tres, 'visita', 'nao_atendeu')).toBeNull();
    expect(visitSuggestion(tres, 'ligacao', null)).toBeNull();
  });
  test('o modelo de WhatsApp muda depois de tentativas sem resposta', () => {
    expect(defaultTemplate(tres)).toBe('tentativas');
    expect(defaultTemplate([tres[0]])).toBe('primeira');
    const msg = whatsappMessage('primeira', { visitorName: 'Lucas Ferreira', senderName: 'Ana Paula Ribeiro', churchName: 'Igreja Batista do Bairro Novo', senderIsReception: true });
    expect(msg).toMatch(/^Oi, Lucas, tudo bem\? Aqui é Ana Paula, da recepção da Igreja Batista do Bairro Novo\./);
  });
});

describe('mudança de etapa', () => {
  test('registrar contato com resposta tira de "Primeira visita"', () => {
    const r = applyContact(fu([], 'primeira_visita'), { ...c('2026-11-16T10:00', 'conversou'), id: 'x' }, '2026-11-23');
    expect(r.stageChanged).toBe('contato_feito');
    expect(r.followUp.stage).toBe('contato_feito');
    expect(r.followUp.nextContact).toBe('2026-11-23');
    expect(r.followUp.stageHistory).toHaveLength(1);
  });
  test('contato sem resposta não muda a etapa', () => {
    const r = applyContact(fu([], 'primeira_visita'), { ...c('2026-11-16T10:00', 'nao_atendeu'), id: 'x' }, '2026-11-18');
    expect(r.stageChanged).toBeNull();
    expect(r.followUp.stage).toBe('primeira_visita');
    expect(r.followUp.contacts).toHaveLength(1);
  });
  test('mudar etapa registra o histórico; membro encerra o acompanhamento', () => {
    const a = changeStage(fu([]), 'retornou', 'p-josue', '2026-11-16T10:00');
    expect(a.stage).toBe('retornou');
    expect(a.stageHistory[0]).toMatchObject({ from: 'contato_feito', to: 'retornou', byId: 'p-josue' });
    const m = changeStage(a, 'membro', 'p-josue', '2026-11-16T10:05');
    expect(m.nextContact).toBeNull();
  });
  test('não aceita a mesma etapa', () => {
    expect(() => changeStage(fu([]), 'contato_feito', 'p-josue', '2026-11-16T10:00')).toThrow(StageError);
  });
});

describe('chamada: saída da aba "Faltam"', () => {
  const s0 = { roster: ['a', 'b', 'c', 'd'], present: [] as string[] };
  test('quem é marcado sai de Faltam e entra em Presentes', () => {
    const s1 = markPresent(s0, 'b');
    expect(faltam(s1)).toEqual(['a', 'c', 'd']);
    expect(presentes(s1)).toEqual(['b']);
  });
  test('marcar duas vezes não duplica', () => {
    expect(markPresent(markPresent(s0, 'b'), 'b').present).toEqual(['b']);
  });
  test('Desfazer devolve à posição original da lista', () => {
    const s = unmark(markPresent(markPresent(s0, 'b'), 'c'), 'b');
    expect(faltam(s)).toEqual(['a', 'b', 'd']);
    expect(presentes(s)).toEqual(['c']);
  });
  test('o último marcado aparece primeiro em Presentes', () => {
    expect(presentes(markPresent(markPresent(s0, 'a'), 'd'))).toEqual(['d', 'a']);
  });
  test('novo visitante entra já presente', () => {
    const s = addAndMark(s0, 'novo');
    expect(s.roster).toContain('novo');
    expect(faltam(s)).not.toContain('novo');
  });
});
