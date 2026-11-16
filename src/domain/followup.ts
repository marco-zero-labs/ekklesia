/** Regras do acompanhamento de visitantes. Funções puras, cobertas por testes. */
import { addDays, DateTime, Day, diffDays } from '@/lib/dates';
import { firstName } from '@/lib/format';
import { Contact, ContactResult, ContactType, FollowUp, Stage, STAGES } from '@/data/types';

/** Dias até o próximo contato sugerido: não atendeu = +2; conversou = +7. */
export const NEXT_CONTACT_DAYS: Record<ContactResult, number> = {
  nao_atendeu: 2,
  conversou: 7,
  retornou_depois: 7,
};

const REASON: Record<ContactResult, string> = {
  nao_atendeu: 'porque não atendeu',
  conversou: 'porque conversou',
  retornou_depois: 'porque retornou depois',
};

export function suggestNextContact(result: ContactResult, from: Day): { day: Day; days: number; reason: string } {
  const days = NEXT_CONTACT_DAYS[result];
  return { day: addDays(from, days), days, reason: REASON[result] };
}

/** Tentativas: contatos feitos pela equipe (a ficha da recepção não conta). */
export function attempts(contacts: Contact[]): Contact[] {
  return contacts.filter((c) => c.type !== 'recepcao');
}

/** Quantas tentativas seguidas, da mais recente para trás, ficaram sem resposta. */
export function unansweredStreak(contacts: Contact[]): number {
  const list = attempts(contacts).sort((a, b) => a.at.localeCompare(b.at));
  let n = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].result === 'nao_atendeu') n++;
    else break;
  }
  return n;
}

/**
 * Sugestão de visita: se esta tentativa (sem resposta) for a 4ª seguida ou mais, sugere uma visita.
 * Só sugere; não muda nada sozinho. Não se aplica quando o próprio contato já é uma visita.
 * Retorna o número da tentativa (4, 5…) ou null.
 */
export function visitSuggestion(contacts: Contact[], type: ContactType | null, result: ContactResult | null): number | null {
  if (type === 'visita') return null;
  if (result !== 'nao_atendeu') return null;
  const n = unansweredStreak(contacts) + 1;
  return n >= 4 ? n : null;
}

/**
 * Registra um contato. Um contato com resposta tira o visitante de "Primeira visita"
 * e o passa para "Contato feito" (o toast oferece Desfazer).
 */
export function applyContact(
  fu: FollowUp,
  c: Omit<Contact, 'id'> & { id: string },
  nextContact: Day | null,
): { followUp: FollowUp; stageChanged: Stage | null } {
  const answered = c.result === 'conversou' || c.result === 'retornou_depois';
  const advance = answered && fu.stage === 'primeira_visita';
  const followUp: FollowUp = {
    ...fu,
    contacts: [...fu.contacts, c].sort((a, b) => a.at.localeCompare(b.at)),
    nextContact,
    stage: advance ? 'contato_feito' : fu.stage,
    stageHistory: advance ? [...fu.stageHistory, { at: c.at, from: fu.stage, to: 'contato_feito', byId: c.byId }] : fu.stageHistory,
  };
  return { followUp, stageChanged: advance ? 'contato_feito' : null };
}

export class StageError extends Error {}

/**
 * Muda a etapa. Qualquer etapa pode ir para qualquer outra (a pessoa pode voltar uma etapa),
 * mas nunca para a mesma. "Membro" encerra o acompanhamento: sem próximo contato.
 */
export function changeStage(fu: FollowUp, to: Stage, byId: string, at: DateTime): FollowUp {
  if (!STAGES.some((s) => s.value === to)) throw new StageError(`Etapa desconhecida: ${to}`);
  if (fu.stage === to) throw new StageError('O visitante já está nesta etapa.');
  return {
    ...fu,
    stage: to,
    nextContact: to === 'membro' ? null : fu.nextContact,
    stageHistory: [...fu.stageHistory, { at, from: fu.stage, to, byId }],
  };
}

/** Ordem da fila: os mais atrasados primeiro; sem data no fim. */
export function byDue<T extends { followUp?: FollowUp; name: string }>(a: T, b: T): number {
  const da = a.followUp?.nextContact ?? '9999-12-31';
  const db = b.followUp?.nextContact ?? '9999-12-31';
  return da.localeCompare(db) || a.name.localeCompare(b.name, 'pt-BR');
}

export function isWaiting(fu: FollowUp | undefined, today: Day): boolean {
  return !!fu && fu.stage !== 'membro' && !!fu.nextContact && diffDays(today, fu.nextContact) <= 0;
}

/** Modelos de mensagem do WhatsApp. */
export type TemplateKind = 'primeira' | 'tentativas';
export function whatsappMessage(
  kind: TemplateKind,
  p: { visitorName: string; senderName: string; churchName: string; senderIsReception?: boolean; nextService?: string },
): string {
  const nome = firstName(p.visitorName.replace(/^Família\s+/, 'família '));
  const quem = firstName(p.senderName);
  const de = p.senderIsReception ? `da recepção da ${p.churchName}` : `da ${p.churchName}`;
  if (kind === 'primeira') {
    return `Oi, ${nome}, tudo bem? Aqui é ${quem}, ${de}. Que bom que você esteve com a gente no culto de domingo.${
      p.nextService ? ` ${p.nextService}, se quiser vir.` : ''
    } Qualquer coisa, pode me chamar por aqui.`;
  }
  return `Oi, ${nome}, tudo bem? Aqui é ${quem}, ${de}. Tentei falar com você por telefone estes dias, mas acho que não era um bom horário. Queria saber como você está e se precisa de alguma coisa. Fico à disposição por aqui.`;
}

export function defaultTemplate(contacts: Contact[]): TemplateKind {
  return unansweredStreak(contacts) > 0 ? 'tentativas' : 'primeira';
}
