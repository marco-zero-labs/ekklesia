/**
 * Dados de exemplo: Igreja Batista do Bairro Novo, com as pessoas, ministérios e números do design.
 * Todas as datas são relativas ao dia de hoje (T), à segunda-feira desta semana (W)
 * e ao último domingo (S), para "Vencido há 4 dias", "Hoje" e "Domingo" sempre fazerem sentido.
 */
import { addDays, Day, diffDays, fmtDayShort, lastSunday, startOfWeek, toDateTime } from '@/lib/dates';
import {
  AgendaEvent,
  Attendance,
  AuditEntry,
  Contact,
  ContactResult,
  ContactType,
  Db,
  Family,
  Ministry,
  Person,
  Schedule,
  Service,
  Slot,
  Stage,
} from './types';

/* ---------- gerador determinístico ---------- */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  'Ana', 'Maria', 'José', 'João', 'Francisco', 'Antônio', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Gabriel', 'Rafael',
  'Daniel', 'Marcelo', 'Bruno', 'Eduardo', 'Felipe', 'Raimundo', 'Rodrigo', 'Manoel', 'Mateus', 'André', 'Fernando', 'Fábio', 'Leonardo',
  'Gustavo', 'Guilherme', 'Diego', 'Juliana', 'Adriana', 'Márcia', 'Fernanda', 'Patrícia', 'Aline', 'Sandra', 'Camila', 'Amanda',
  'Bruna', 'Jéssica', 'Letícia', 'Júlia', 'Luciana', 'Vanessa', 'Mariana', 'Gabriela', 'Vera', 'Vitória', 'Larissa', 'Cláudia',
  'Beatriz', 'Rita', 'Luana', 'Sônia', 'Renata', 'Eliane', 'Josefa', 'Severina', 'Cícera', 'Edvaldo', 'Givaldo', 'Rosilda', 'Elisângela',
  'Joelma', 'Valdir', 'Gilberto', 'Nivaldo', 'Socorro', 'Lúcia', 'Graça', 'Tereza', 'Rosângela', 'Wagner', 'Wilson', 'Jailson', 'Erivaldo',
];
const LAST = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Alves',
  'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Barbosa', 'Melo', 'Cavalcanti', 'Albuquerque', 'Lins', 'Moura', 'Bezerra', 'Tavares',
  'Freitas', 'Rocha', 'Batista', 'Monteiro', 'Pessoa', 'Vasconcelos', 'Andrade', 'Siqueira', 'Coutinho', 'Duarte', 'Pires', 'Queiroz',
  'Medeiros', 'Fernandes', 'Teixeira', 'Correia', 'Cardoso', 'Farias', 'Brito', 'Leite', 'Barros', 'Arruda', 'Gouveia', 'Lacerda',
];

export const SEED_IDS = {
  pastor: 'p-josue',
  secretaria: 'p-anapaula',
  lider: 'p-raimunda',
};

export function buildSeed(today: Day, now: Date = new Date()): Db {
  const T = today;
  const W = startOfWeek(T);
  const S = lastSunday(T);
  const t = (n: number) => addDays(T, n);
  const s = (n: number) => addDays(S, n);
  const w = (n: number) => addDays(W, n);
  const at = (day: Day, hhmm: string): string => `${day}T${hhmm}`;
  const minutesAgo = (m: number) => toDateTime(new Date(now.getTime() - m * 60000));
  const sundays8 = Array.from({ length: 8 }, (_, i) => s(-7 * (7 - i))); // do mais antigo ao último domingo
  const rand = mulberry32(20261116);
  const pick = <X,>(arr: X[]) => arr[Math.floor(rand() * arr.length)];

  const people: Person[] = [];
  const base = (p: Partial<Person> & { id: string; name: string }): Person => ({
    kind: 'membro',
    active: true,
    ministries: [],
    presence: sundays8,
    consent: { status: 'pendente', via: 'cadastro anterior ao Limen' },
    createdAt: at(s(-60), '10:00'),
    updatedAt: at(s(-30), '10:00'),
    updatedById: SEED_IDS.secretaria,
    ...p,
  });
  const presenceExcept = (...missing: number[]) => sundays8.filter((_, i) => !missing.includes(i));
  const presenceUntil = (lastIdx: number) => sundays8.slice(0, lastIdx + 1);

  /* ---------- famílias ---------- */
  const families: Family[] = [
    { id: 'f-souza', name: 'Família Souza' },
    { id: 'f-arruda', name: 'Família Arruda' },
  ];

  /* ---------- membros com nome do design ---------- */
  const birthday = (day: Day, year: number) => `${year}${day.slice(4)}`;
  const named: Person[] = [
    base({ id: 'p-josue', name: 'Josué Almeida', phone: '(81) 99800-1200', title: 'Pastor titular', memberSince: '2004-02-01', consent: { status: 'dado', at: at(s(-30), '10:00'), via: 'ficha digital' } }),
    base({ id: 'p-anapaula', name: 'Ana Paula Ribeiro', phone: '(81) 99701-2265', title: 'Secretária', memberSince: '2011-08-14', consent: { status: 'dado', at: at(s(-30), '10:05'), via: 'ficha digital' } }),
    base({ id: 'p-raimunda', name: 'Raimunda Souza', phone: '(81) 99355-0418', familyId: 'f-souza', familyRole: 'Esposa', memberSince: '1998-06-14', address: 'Rua Projetada 18, Bairro Novo, Olinda – PE · 53130-410', birthDate: '1963-07-02', consent: { status: 'dado', at: at(s(-14), '11:20'), via: 'link pelo WhatsApp' } }),
    base({ id: 'p-thiago', name: 'Thiago Batista', phone: '(81) 99502-3381', memberSince: '2015-03-08', title: 'Diácono', consent: { status: 'dado', at: at(s(-21), '19:00'), via: 'ficha digital' } }),
    base({
      id: 'p-benedito', name: 'Benedito Souza', phone: '(81) 3427-5512', title: 'Diácono', familyId: 'f-souza', familyRole: 'Marido',
      memberSince: '1998-06-14', birthDate: '1961-03-12', address: 'Rua Projetada 12, Bairro Novo, Olinda – PE · 53130-410',
      presence: presenceExcept(3),
      pastoralNote: `Pediu visita para conversar sobre a mudança de emprego. Visita marcada para ${fmtDayShort(w(3)).toLowerCase()}.`,
      updatedAt: at(t(-4), '14:32'), updatedById: SEED_IDS.secretaria,
    }),
    base({ id: 'p-livia', name: 'Lívia Souza Andrade', phone: '(81) 99318-7702', familyId: 'f-souza', familyRole: 'Filha', birthDate: birthday(w(6), 1999), memberSince: '2013-12-01' }),
    base({ id: 'p-adriana', name: 'Adriana Melo', phone: '(81) 99412-3380', memberSince: '2016-05-22' }),
    base({ id: 'p-alexandre', name: 'Alexandre Tavares Pontes', phone: '(81) 98820-1147', memberSince: '2009-09-13' }),
    base({ id: 'p-antonia', name: 'Antônia Ferreira Lima', memberSince: '2001-04-01', presence: presenceUntil(3) }),
    base({ id: 'p-carla', name: 'Carla Nascimento Duarte', phone: '(81) 99634-0081', memberSince: '2007-10-07' }),
    base({ id: 'p-cicero', name: 'Cícero Alves de Moura', phone: '(81) 98716-4430', memberSince: '2012-01-15', presence: presenceUntil(5) }),
    base({ id: 'p-daniel', name: 'Daniel Batista', phone: '(81) 99855-7012', memberSince: '2018-04-01' }),
    base({ id: 'p-edilene', name: 'Edilene Santos', phone: '(81) 99123-6649', memberSince: '2010-06-20', presence: presenceExcept(7) }),
    base({ id: 'p-fabio', name: 'Fábio Henrique Cordeiro', phone: '(81) 98577-3092', memberSince: '2014-11-02' }),
    base({ id: 'p-gloria', name: 'Glória Maria Bezerra', memberSince: '1995-03-12' }),
    base({ id: 'p-helio', name: 'Hélio Ramos', phone: '(81) 3445-7781', memberSince: '1990-08-05', birthDate: birthday(w(4), 1952), presence: presenceUntil(4) }),
    base({ id: 'p-ivone', name: 'Ivone Pereira', phone: '(81) 99266-1904', memberSince: '1999-02-28', birthDate: birthday(w(2), 1968) }),
    base({ id: 'p-jaqueline', name: 'Jaqueline Rocha Siqueira', phone: '(81) 98431-0570', memberSince: '2008-07-27', presence: presenceExcept(7) }),
    base({ id: 'p-thais', name: 'Thaís Arruda', phone: '(81) 99742-6610', kind: 'congregado', familyId: 'f-arruda', familyRole: 'Esposa', presence: presenceUntil(7).slice(4) }),
    base({ id: 'p-bruno', name: 'Bruno Arruda', phone: '(81) 99742-6611', kind: 'congregado', familyId: 'f-arruda', familyRole: 'Marido', presence: sundays8.slice(4, 6) }),
  ];
  people.push(...named);

  /* ---------- visitantes (os 24 do design) ---------- */
  type V = {
    id: string; name: string; phone?: string; stage: Stage; resp: string | null; due: number; attempts: number;
    first: Day; service?: string; invitedBy?: string; last?: { daysAgo: number; type: ContactType; result: ContactResult; by: string; note?: string };
    consent?: 'dado' | 'verbal' | 'pendente';
  };
  const R = SEED_IDS.lider, A = SEED_IDS.secretaria, TB = 'p-thiago', J = SEED_IDS.pastor;
  const vs: V[] = [
    { id: 'v-severino', name: 'Severino Ramos da Silva', stage: 'contato_feito', resp: R, due: -6, attempts: 3, first: s(-35), invitedBy: 'Raimunda Souza', last: { daysAgo: 12, type: 'visita', result: 'nao_atendeu', by: R, note: 'Ninguém em casa.' }, consent: 'verbal' },
    { id: 'v-mariadasgracas', name: 'Maria das Graças Nascimento Silva', phone: '(81) 3427-1180', stage: 'contato_feito', resp: TB, due: -4, attempts: 0, first: s(-21), invitedBy: 'Raimunda Souza' },
    { id: 'v-edson', name: 'Edson Barbosa', phone: '(81) 99923-7761', stage: 'retornou', resp: null, due: -3, attempts: 2, first: s(-28), last: { daysAgo: 10, type: 'ligacao', result: 'conversou', by: TB, note: 'Gostou do culto. Vai trazer a esposa.' } },
    { id: 'v-wellington', name: 'Wellington Santos', phone: '(81) 99107-5523', stage: 'contato_feito', resp: TB, due: -2, attempts: 1, first: s(-14), last: { daysAgo: 6, type: 'mensagem', result: 'conversou', by: TB, note: 'Respondeu que volta no domingo.' } },
    { id: 'v-gabriel', name: 'Gabriel Lins', phone: '(81) 99655-1287', stage: 'contato_feito', resp: J, due: -1, attempts: 1, first: s(-14), last: { daysAgo: 5, type: 'mensagem', result: 'conversou', by: J } },
    { id: 'v-francisca', name: 'Francisca Alves', phone: '(81) 3445-9021', stage: 'retornou', resp: R, due: -1, attempts: 3, first: s(-35), last: { daysAgo: 8, type: 'ligacao', result: 'conversou', by: R, note: 'Pediu oração pela filha.' } },
    { id: 'v-lucas', name: 'Lucas Ferreira', phone: '(81) 99812-4407', stage: 'primeira_visita', resp: A, due: 0, attempts: 0, first: S, invitedBy: 'Josué Almeida' },
    { id: 'v-daniela', name: 'Daniela Rocha de Albuquerque', phone: '(81) 98733-1590', stage: 'primeira_visita', resp: A, due: 0, attempts: 0, first: S },
    { id: 'v-pedromariana', name: 'Pedro Henrique e Mariana Costa', stage: 'primeira_visita', resp: null, due: 0, attempts: 0, first: S, consent: 'verbal' },
    { id: 'v-jessica', name: 'Jéssica Karoline Oliveira', stage: 'primeira_visita', resp: A, due: 0, attempts: 0, first: S, consent: 'pendente' },
    { id: 'v-luana', name: 'Luana Siqueira', phone: '(81) 99318-2046', stage: 'primeira_visita', resp: A, due: 0, attempts: 0 , first: S },
    { id: 'v-davi', name: 'Davi Coutinho', stage: 'primeira_visita', resp: null, due: 0, attempts: 0, first: S, consent: 'pendente' },
    { id: 'v-antonio', name: 'Antônio Carlos Bezerra', phone: '(81) 99281-4470', stage: 'retornou', resp: R, due: 1, attempts: 2, first: s(-21), last: { daysAgo: 4, type: 'ligacao', result: 'conversou', by: R } },
    { id: 'v-leticia', name: 'Letícia Fernandes', phone: '(81) 98840-1932', stage: 'primeira_visita', resp: A, due: 1, attempts: 1, first: s(-7), last: { daysAgo: 6, type: 'whatsapp', result: 'nao_atendeu', by: A } },
    { id: 'v-igor', name: 'Igor Medeiros', phone: '(81) 99577-0865', stage: 'primeira_visita', resp: TB, due: 1, attempts: 1, first: s(-7), last: { daysAgo: 6, type: 'ligacao', result: 'nao_atendeu', by: TB } },
    { id: 'v-nascimento', name: 'Família Nascimento (4 pessoas)', phone: '(81) 99634-2208', stage: 'retornou', resp: R, due: 2, attempts: 2, first: s(-28), last: { daysAgo: 3, type: 'visita', result: 'conversou', by: R, note: 'Visita em casa. As crianças querem ir ao Infantil.' } },
    { id: 'v-camila', name: 'Camila Duarte Pessoa', phone: '(81) 99714-3356', stage: 'contato_feito', resp: TB, due: 2, attempts: 2, first: s(-14), last: { daysAgo: 5, type: 'whatsapp', result: 'conversou', by: TB } },
    { id: 'v-monteiro', name: 'Rafael e Priscila Monteiro', phone: '(81) 98102-7745', stage: 'retornou', resp: TB, due: 3, attempts: 1, first: s(-21), last: { daysAgo: 4, type: 'ligacao', result: 'conversou', by: TB } },
    { id: 'v-arruda', name: 'Thaís e Bruno Arruda', phone: '(81) 99742-6610', stage: 'contato_feito', resp: J, due: 3, attempts: 1, first: s(-28), last: { daysAgo: 4, type: 'visita', result: 'conversou', by: J } },
    { id: 'v-anabeatriz', name: 'Ana Beatriz Cavalcanti Moura', phone: '(81) 99883-1204', stage: 'em_integracao', resp: A, due: 4, attempts: 4, first: s(-56), last: { daysAgo: 3, type: 'whatsapp', result: 'conversou', by: A, note: 'Começa a classe de novos membros no domingo.' } },
    { id: 'v-rebeca', name: 'Rebeca Lacerda Gouveia', phone: '(81) 99520-6617', stage: 'contato_feito', resp: A, due: 4, attempts: 2, first: s(-21), last: { daysAgo: 4, type: 'mensagem', result: 'conversou', by: A } },
    { id: 'v-joaquim', name: 'Joaquim Vieira Neto', phone: '(81) 98966-0321', stage: 'em_integracao', resp: J, due: 6, attempts: 5, first: s(-63), last: { daysAgo: 2, type: 'visita', result: 'conversou', by: J } },
    { id: 'v-marcos', name: 'Marcos Antônio Pereira Lima', phone: '(81) 99134-5580', stage: 'em_integracao', resp: R, due: 9, attempts: 3, first: s(-49), last: { daysAgo: 5, type: 'ligacao', result: 'conversou', by: R } },
    { id: 'v-simone', name: 'Simone Rezende', phone: '(81) 99460-3318', stage: 'em_integracao', resp: J, due: 11, attempts: 4, first: s(-56), last: { daysAgo: 3, type: 'visita', result: 'conversou', by: J } },
  ];
  let cid = 0;
  const contact = (day: Day, hhmm: string, type: ContactType, byId: string, result?: ContactResult, note?: string): Contact => ({
    id: `c-${++cid}`, at: at(day, hhmm), type, byId, result, note,
  });
  for (const v of vs) {
    const service = v.service ?? 'culto de domingo à noite';
    const contacts: Contact[] = [
      contact(v.first, '20:10', 'recepcao', A, undefined, `Ficha de visitante preenchida no ${service}.${v.invitedBy ? ` Convidad${v.name.endsWith('a') ? 'a' : 'o'} por ${v.invitedBy}.` : ''}`),
    ];
    if (v.id === 'v-mariadasgracas') {
      contacts.push(
        contact(s(-18), '18:40', 'mensagem', TB, 'conversou', 'Respondeu que pretende voltar no culto da noite.'),
        contact(t(-15), '19:20', 'whatsapp', TB, 'nao_atendeu', 'Mensagem lida, sem resposta.'),
        contact(t(-12), '19:30', 'ligacao', TB, 'nao_atendeu'),
        contact(t(-7), '19:10', 'ligacao', TB, 'nao_atendeu', 'Não atendeu. Tentar à noite, depois das 19h.'),
      );
    } else if (v.last) {
      const lastDay = t(-v.last.daysAgo);
      // tentativas anteriores espalhadas entre a 1ª visita e a última tentativa
      const span = diffDays(v.first, lastDay);
      for (let i = 1; i < v.attempts; i++) {
        const d = addDays(v.first, Math.max(1, Math.round((i * span) / v.attempts)));
        const result: ContactResult = v.last.result === 'nao_atendeu' ? 'nao_atendeu' : i === 1 ? 'conversou' : 'nao_atendeu';
        contacts.push(contact(d, '19:00', v.last.type === 'visita' && !v.phone ? 'visita' : i % 2 ? 'ligacao' : 'whatsapp', v.last.by, result));
      }
      contacts.push(contact(lastDay, '19:45', v.last.type, v.last.by, v.last.result, v.last.note));
    }
    contacts.sort((a, b) => a.at.localeCompare(b.at));
    const consentStatus = v.consent ?? 'dado';
    people.push(
      base({
        id: v.id,
        name: v.name,
        phone: v.phone,
        kind: 'visitante',
        presence: [v.first, ...(v.stage === 'primeira_visita' ? [] : sundays8.filter((d) => d > v.first).slice(-2))],
        invitedBy: v.invitedBy,
        consent:
          consentStatus === 'dado'
            ? { status: 'dado', at: at(v.first, '20:10'), via: 'ficha digital' }
            : consentStatus === 'verbal'
              ? { status: 'verbal', at: at(v.first, '20:10'), via: 'verbal, coletado por Ana Paula Ribeiro' }
              : { status: 'pendente', via: 'link pelo WhatsApp' },
        createdAt: at(v.first, '20:10'),
        updatedAt: contacts[contacts.length - 1].at,
        updatedById: contacts[contacts.length - 1].byId,
        followUp: {
          stage: v.stage,
          firstVisit: v.first,
          firstVisitService: service,
          nextContact: t(v.due),
          responsibleId: v.resp,
          howFound: v.invitedBy ? 'Fui convidado' : pick(['Redes sociais', 'Passei na frente', 'Fui convidado']),
          contacts,
          stageHistory: [],
        },
        prayerRequest: v.id === 'v-francisca' ? 'Pela saúde da filha, que vai operar em dezembro.' : undefined,
      }),
    );
  }

  /* ---------- pessoas geradas para chegar aos números do design ---------- */
  // 412 membros ativos · 538 cadastros (26 com nome + 24 visitantes + 488 geradas)
  const used = new Set(people.map((p) => p.name));
  const genName = () => {
    for (;;) {
      const n = `${pick(FIRST)} ${pick(LAST)}${rand() < 0.35 ? ` ${pick(LAST)}` : ''}`;
      if (!used.has(n)) {
        used.add(n);
        return n;
      }
    }
  };
  const genPhone = () => {
    const d = () => Math.floor(rand() * 10);
    return `(81) 9${8 + Math.floor(rand() * 2)}${d()}${d()}${d()}-${d()}${d()}${d()}${d()}`;
  };
  const namedActiveMembers = people.filter((p) => p.kind === 'membro' && p.active).length;
  const plan: { kind: 'membro' | 'congregado'; active: boolean; count: number }[] = [
    { kind: 'membro', active: true, count: 412 - namedActiveMembers },
    { kind: 'membro', active: false, count: 60 },
    { kind: 'congregado', active: true, count: 538 - 24 - people.filter((p) => p.kind !== 'visitante').length - (412 - namedActiveMembers) - 60 },
  ];
  const thisWeekMD = new Set(Array.from({ length: 7 }, (_, i) => w(i).slice(5)));
  let gid = 0;
  let withoutPhone = 0;
  let absent = 0;
  for (const g of plan) {
    for (let i = 0; i < g.count; i++) {
      const id = `g-${++gid}`;
      const noPhone = withoutPhone < 25 && rand() < 0.06;
      if (noPhone) withoutPhone++;
      let presence: Day[];
      if (!g.active) presence = [];
      else if (absent < 21 && g.kind === 'membro' && rand() < 0.06) {
        absent++;
        presence = sundays8.slice(0, 2 + Math.floor(rand() * 2));
      } else presence = sundays8.filter(() => rand() < 0.8);
      if (g.active && presence.length === 0) presence = [S];
      const year = 1940 + Math.floor(rand() * 68);
      const month = 1 + Math.floor(rand() * 12);
      const day = 1 + Math.floor(rand() * 28);
      let birth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // aniversariantes desta semana são só os do design (Ivone, Hélio e Lívia)
      if (thisWeekMD.has(birth.slice(5))) birth = `${year}${addDays(`2001${birth.slice(4)}`, 14).slice(4)}`;
      people.push(
        base({
          id,
          name: genName(),
          phone: noPhone ? undefined : genPhone(),
          kind: g.kind,
          active: g.active,
          presence,
          birthDate: birth,
          memberSince: g.kind === 'membro' ? `${1985 + Math.floor(rand() * 40)}-0${1 + Math.floor(rand() * 9)}-01` : undefined,
          consent: rand() < 0.12 ? { status: 'dado', at: at(s(-14), '10:00'), via: 'link pelo WhatsApp' } : { status: 'pendente', via: 'cadastro anterior ao Limen' },
        }),
      );
    }
  }

  /* ---------- ministérios (9 ministérios · 150 pessoas servindo) ---------- */
  const activeGenerated = people.filter((p) => p.id.startsWith('g-') && p.active && p.kind === 'membro');
  let gi = 0;
  const fill = (ids: string[], total: number) => {
    const out = [...ids];
    while (out.length < total) out.push(activeGenerated[gi++ % activeGenerated.length].id);
    return out;
  };
  const ministries: Ministry[] = [
    { id: 'm-louvor', name: 'Louvor', leaderId: 'p-carla', roles: ['Ministração', 'Vocal', 'Violão', 'Teclado', 'Baixo', 'Bateria', 'Som'], memberIds: fill(['p-carla', 'p-livia', 'v-rebeca', 'p-alexandre', 'p-thais', 'p-bruno', 'p-fabio', 'p-daniel'], 18) },
    { id: 'm-recepcao', name: 'Recepção', leaderId: 'p-anapaula', roles: ['Recepção', 'Ficha de visitantes'], memberIds: fill(['p-anapaula', 'p-raimunda', 'p-jaqueline'], 14) },
    { id: 'm-infantil', name: 'Infantil', leaderId: 'p-edilene', roles: ['Professora', 'Auxiliar'], memberIds: fill(['p-edilene', 'p-adriana'], 22) },
    { id: 'm-diaconia', name: 'Diaconia', leaderId: 'p-benedito', roles: ['Diácono', 'Santa Ceia', 'Portaria'], memberIds: fill(['p-benedito', 'p-alexandre', 'p-helio', 'p-thiago'], 9) },
    { id: 'm-midia', name: 'Mídia', leaderId: 'p-fabio', roles: ['Projeção', 'Transmissão', 'Fotografia'], memberIds: fill(['p-fabio'], 6) },
    { id: 'm-coral', name: 'Coral', leaderId: 'p-gloria', roles: ['Soprano', 'Contralto', 'Tenor', 'Baixo'], memberIds: fill(['p-gloria'], 22) },
    { id: 'm-jovens', name: 'Jovens', leaderId: 'p-daniel', roles: ['Coordenação', 'Louvor', 'Cozinha'], memberIds: fill(['p-daniel', 'p-livia'], 31) },
    { id: 'm-intercessao', name: 'Intercessão', leaderId: 'p-ivone', roles: ['Intercessão'], memberIds: fill(['p-ivone', 'p-raimunda'], 12) },
    { id: 'm-ebd', name: 'EBD', leaderId: 'p-jaqueline', roles: ['Professor', 'Secretaria da classe'], memberIds: fill(['p-jaqueline', 'p-carla'], 16) },
  ];
  const roleOf: Record<string, Record<string, string>> = {
    'm-diaconia': { 'p-benedito': 'Diácono desde 2006', 'p-thiago': 'Diácono' },
    'm-louvor': { 'p-carla': 'Líder', 'p-livia': 'Vocal', 'v-rebeca': 'Vocal', 'p-alexandre': 'Violão', 'p-thais': 'Teclado', 'p-bruno': 'Baixo', 'p-fabio': 'Som', 'p-daniel': 'Bateria' },
    'm-recepcao': { 'p-anapaula': 'Líder' },
  };
  for (const m of ministries) {
    for (const pid of m.memberIds) {
      const p = people.find((x) => x.id === pid);
      if (p) p.ministries.push({ ministryId: m.id, role: roleOf[m.id]?.[pid] ?? (pid === m.leaderId ? 'Líder' : undefined) });
    }
  }

  /* ---------- cultos e células recorrentes ---------- */
  const celulaBN = ['p-raimunda', 'p-benedito', 'p-livia', 'p-ivone', 'v-severino', 'v-francisca', 'v-nascimento', ...activeGenerated.slice(40, 48).map((p) => p.id)];
  const celulaJA = ['p-daniel', 'p-cicero', 'v-igor', 'v-camila', ...activeGenerated.slice(60, 69).map((p) => p.id)];
  const ebdJovensAdultos = ['v-arruda', 'p-bruno', 'v-camila', 'p-fabio', 'v-gabriel', 'v-rebeca', 'v-wellington', 'p-thais', 'p-daniel', 'p-livia', 'v-leticia', 'v-igor', ...activeGenerated.slice(80, 83).map((p) => p.id)].filter((id) => id !== 'v-arruda');
  const services: Service[] = [
    { id: 's-ebd', name: 'EBD', weekday: 0, time: '09:00', mode: 'chamada', location: 'Sala 3', kind: 'culto', ministryId: 'm-ebd', rosterIds: ebdJovensAdultos, group: 'Classe Jovens Adultos' },
    { id: 's-manha', name: 'Culto de domingo – manhã', weekday: 0, time: '10:30', mode: 'contagem', location: 'Templo', kind: 'culto' },
    { id: 's-noite', name: 'Culto de domingo – noite', weekday: 0, time: '18:00', mode: 'contagem', location: 'Templo', kind: 'culto' },
    { id: 's-oracao', name: 'Culto de oração', weekday: 3, time: '19:30', mode: 'contagem', location: 'Templo', kind: 'culto', ministryId: 'm-intercessao' },
    { id: 's-celula-bn', name: 'Célula Bairro Novo', weekday: 2, time: '20:00', mode: 'chamada', location: 'Casa de Raimunda Souza', kind: 'celula', responsibleId: 'p-raimunda', rosterIds: celulaBN },
    { id: 's-celula-ja', name: 'Célula Jardim Alvorada', weekday: 4, time: '20:00', mode: 'chamada', location: 'Casa de Cícero Alves de Moura', kind: 'celula', responsibleId: 'p-daniel', rosterIds: celulaJA },
  ];
  const actId = (serviceId: string, day: Day) => `${serviceId}.${day}`;

  /* ---------- agenda: atividades avulsas desta semana ---------- */
  const events: AgendaEvent[] = [
    { id: 'e-coral', title: 'Ensaio do coral', date: w(4), time: '20:00', endTime: '21:30', location: 'Sala 2', ministryId: 'm-coral', createdById: 'p-gloria' },
    { id: 'e-retiro', title: 'Retiro de Jovens', date: w(5), time: '07:00', endTime: '18:00', location: 'Sítio Recanto', ministryId: 'm-jovens', info: '34 de 60 inscritos', createdById: 'p-daniel' },
    { id: 'e-diaconos', title: 'Reunião de diáconos', date: w(5), time: '13:30', endTime: '15:00', location: 'Sala 1', ministryId: 'm-diaconia', createdById: 'p-benedito' },
    { id: 'e-ensaio-louvor', title: 'Ensaio do Louvor', date: w(5), time: '16:00', endTime: '18:00', location: 'Templo', ministryId: 'm-louvor', createdById: 'p-carla' },
  ];

  /* ---------- escalas ---------- */
  let sid = 0;
  const slot = (role: string, personId: string | null, status: Slot['status'] = 'confirmado'): Slot => ({
    id: `x${(++sid).toString(36)}${Math.floor(rand() * 1e6).toString(36)}`,
    role,
    personId,
    status: personId ? status : 'aguardando',
    respondedAt: personId && status !== 'aguardando' ? at(t(-1), '20:00') : undefined,
  });
  const nextSunday = w(6);
  const gen = (m: string, n: number, offset = 0) => ministries.find((x) => x.id === m)!.memberIds.slice(-n - offset, offset ? -offset : undefined);
  const schedules: Schedule[] = [
    {
      id: 'esc-louvor-noite', ministryId: 'm-louvor', activityId: actId('s-noite', nextSunday), arrival: '17:00',
      rehearsal: { date: w(5), time: '16:00', location: 'Templo' },
      slots: [
        slot('Ministração', 'p-carla'), slot('Vocal', 'p-livia'), slot('Vocal', 'v-rebeca'), slot('Violão', 'p-alexandre'),
        slot('Teclado', 'p-thais'), slot('Baixo', 'p-bruno', 'aguardando'), slot('Bateria', null), slot('Som', 'p-fabio'),
      ],
    },
    { id: 'esc-recepcao-manha', ministryId: 'm-recepcao', activityId: actId('s-manha', nextSunday), arrival: '10:00', slots: [slot('Recepção', 'p-anapaula'), slot('Recepção', 'p-raimunda'), slot('Ficha de visitantes', 'p-jaqueline'), ...gen('m-recepcao', 1).map((id) => slot('Recepção', id))] },
    { id: 'esc-infantil-manha', ministryId: 'm-infantil', activityId: actId('s-manha', nextSunday), slots: [slot('Professora', 'p-edilene'), slot('Professora', 'p-adriana'), ...gen('m-infantil', 2).map((id) => slot('Auxiliar', id))] },
    { id: 'esc-diaconia-noite', ministryId: 'm-diaconia', activityId: actId('s-noite', nextSunday), slots: [slot('Santa Ceia', 'p-benedito'), slot('Santa Ceia', 'p-helio'), slot('Portaria', 'p-thiago')] },
    { id: 'esc-midia-noite', ministryId: 'm-midia', activityId: actId('s-noite', nextSunday), slots: [slot('Projeção', gen('m-midia', 1)[0]), slot('Transmissão', gen('m-midia', 2)[0])] },
    { id: 'esc-coral-ensaio', ministryId: 'm-coral', activityId: 'e-coral', slots: ministries.find((m) => m.id === 'm-coral')!.memberIds.map((id, i) => slot(['Soprano', 'Contralto', 'Tenor', 'Baixo'][i % 4], id, i >= 18 ? 'aguardando' : 'confirmado')) },
    { id: 'esc-jovens-retiro', ministryId: 'm-jovens', activityId: 'e-retiro', slots: [slot('Coordenação', 'p-daniel'), slot('Louvor', 'p-livia'), ...gen('m-jovens', 2).map((id) => slot('Cozinha', id))] },
    { id: 'esc-intercessao-oracao', ministryId: 'm-intercessao', activityId: actId('s-oracao', w(2)), slots: [slot('Intercessão', 'p-ivone'), ...gen('m-intercessao', 2).map((id) => slot('Intercessão', id))] },
    { id: 'esc-intercessao-oracao-2', ministryId: 'm-intercessao', activityId: actId('s-oracao', w(9)), slots: [slot('Intercessão', 'p-ivone'), slot('Intercessão', 'p-raimunda', 'aguardando')] },
    { id: 'esc-ebd', ministryId: 'm-ebd', activityId: actId('s-ebd', nextSunday), slots: [slot('Professor', 'p-jaqueline'), slot('Secretaria da classe', gen('m-ebd', 1)[0])] },
  ];

  /* ---------- frequência (8 semanas) ---------- */
  const noite = [305, 290, 292, 294, 298, 295, 301, 287];
  const manha = [198, 194, 199, 195, 196, 200, 205, 198];
  const visN = [3, 5, 4, 3, 4, 4, 5, 6];
  const visM = [0, 0, 0, 0, 0, 0, 3, 0];
  const kidsN = [36, 40, 37, 35, 39, 38, 38, 41];
  const kidsM = [44, 41, 45, 42, 43, 46, 47, 44];
  const recorders = [A, 'p-thiago'];
  const attendance: Attendance[] = [];
  let aid = 0;
  const rec = (activityId: string, title: string, date: Day, mode: 'contagem' | 'chamada', present: number, visitors: number, children: number, by: string, extra: Partial<Attendance> = {}) =>
    attendance.push({ id: `a-${++aid}`, activityId, title, date, mode, present, visitors, children, done: true, recordedById: by, recordedAt: at(date, mode === 'chamada' ? '10:30' : '20:30'), ...extra });
  sundays8.forEach((d, i) => {
    const last = i === 7;
    const by = last ? A : i === 6 ? 'p-thiago' : recorders[i % 2];
    rec(actId('s-noite', d), 'Culto de domingo – noite', d, 'contagem', noite[i], visN[i], kidsN[i], by, last ? { recordedAt: minutesAgo(25) } : {});
    rec(actId('s-manha', d), 'Culto de domingo – manhã', d, 'contagem', manha[i], visM[i], kidsM[i], by);
    if (!last) {
      const presentIds = ebdJovensAdultos.filter((_, k) => (k + i) % 5 !== 0);
      rec(actId('s-ebd', d), 'EBD', d, 'chamada', presentIds.length, 0, 0, 'p-jaqueline', { presentIds });
    }
  });
  // EBD do último domingo: chamada em andamento (Faltam 6 · Presentes 9), como no design
  const ebdMissing = ['p-bruno', 'v-camila', 'p-fabio', 'v-gabriel', 'v-rebeca', 'v-wellington'];
  const ebdPresent = ebdJovensAdultos.filter((id) => !ebdMissing.includes(id));
  attendance.push({ id: `a-${++aid}`, activityId: actId('s-ebd', S), title: 'EBD', date: S, mode: 'chamada', present: ebdPresent.length, visitors: 0, children: 0, presentIds: ebdPresent, done: false, recordedById: 'p-jaqueline', recordedAt: at(S, '09:20') });
  // oração e células: 5 semanas para ter média
  const oracao = [60, 62, 61, 61, 64];
  const bn = [13, 13, 12, 14, 14];
  const ja = [13, 12, 14, 13, 11];
  for (let i = 0; i < 5; i++) {
    const back = -7 * (4 - i);
    const dOr = s(back - 4);
    const dBn = s(back - 5);
    const dJa = s(back - 3);
    rec(actId('s-oracao', dOr), 'Culto de oração', dOr, 'contagem', oracao[i], 0, 0, A);
    rec(actId('s-celula-bn', dBn), 'Célula Bairro Novo', dBn, 'chamada', bn[i], i === 4 ? 1 : 0, 0, 'p-raimunda', { presentIds: celulaBN.slice(0, bn[i]) });
    rec(actId('s-celula-ja', dJa), 'Célula Jardim Alvorada', dJa, 'chamada', ja[i], 0, 0, 'p-daniel', { presentIds: celulaJA.slice(0, ja[i]) });
  }
  attendance.sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt));

  /* ---------- trilha de auditoria ---------- */
  const audit: AuditEntry[] = [
    { id: 'au-6', at: minutesAgo(25), actorId: A, action: 'Registrou contagem', target: `Culto de domingo – noite, ${fmtDayShort(S).toLowerCase()}`, targetId: actId('s-noite', S) },
    { id: 'au-5', at: minutesAgo(180), actorId: J, action: 'Abriu nota pastoral', target: 'Benedito Souza', targetId: 'p-benedito' },
    { id: 'au-4', at: at(t(-1), '21:05'), actorId: 'p-carla', action: 'Alterou escala', target: `Louvor · ${fmtDayShort(nextSunday)}, noite`, targetId: 'esc-louvor-noite' },
    { id: 'au-3', at: at(t(-4), '14:32'), actorId: A, action: 'Alterou endereço', target: 'Benedito Souza', targetId: 'p-benedito' },
    { id: 'au-2', at: at(t(-4), '10:03'), actorId: J, action: 'Deu acesso de Líder', target: 'Daniel Batista · Jovens', targetId: 'p-daniel' },
    { id: 'au-1', at: at(t(-5), '16:40'), actorId: TB, action: 'Exportou lista', target: 'Visitantes, últimos 90 dias · 41 registros' },
  ];

  return {
    version: 1,
    seededOn: T,
    pristine: true,
    church: {
      name: 'Igreja Batista do Bairro Novo',
      denomination: 'Convenção Batista Brasileira',
      cep: '53130-410',
      street: 'Rua Projetada',
      number: '40',
      district: 'Bairro Novo',
      city: 'Olinda – PE',
      phone: '(81) 3427-0040',
      setupDone: true,
      setupStep: 4,
    },
    people,
    families,
    ministries,
    services,
    events,
    schedules,
    attendance,
    audit,
  };
}

/** Igreja vazia (para começar do zero e ver o primeiro uso). */
export function buildEmpty(today: Day): Db {
  const seed = buildSeed(today);
  return {
    ...seed,
    pristine: false,
    church: { ...seed.church, setupDone: false, setupStep: 1 },
    people: seed.people.filter((p) => ['p-josue', 'p-anapaula', 'p-raimunda'].includes(p.id)).map((p) => ({ ...p, ministries: [], familyId: undefined, familyRole: undefined, presence: [] })),
    families: [],
    ministries: [],
    services: [],
    events: [],
    schedules: [],
    attendance: [],
    audit: [],
  };
}
