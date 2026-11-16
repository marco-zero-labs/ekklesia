import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { Choice, Field } from '@/components/Field';
import { EmptyLine, Row } from '@/components/List';
import { Detail, Page } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useViewer } from '@/data/DataProvider';
import { Person, USERS } from '@/data/types';
import { AppData, isVisitor, useAppData } from '@/data/useAppData';
import { canEditPerson, canSeePerson, canSeeVisitor } from '@/domain/permissions';
import { addDays, fmtDayMonth, startOfWeek, todayDay, weekdayShort } from '@/lib/dates';
import { firstName, fmtInt, normalize, onlyDigits } from '@/lib/format';

type Tipo = 'ativos' | 'todos' | 'congregados' | 'visitantes' | 'inativos';
const TIPOS: { value: Tipo; label: string; phrase: string }[] = [
  { value: 'ativos', label: 'Membros ativos', phrase: 'membro ativo' },
  { value: 'congregados', label: 'Congregados', phrase: 'congregado' },
  { value: 'visitantes', label: 'Visitantes', phrase: 'visitante' },
  { value: 'inativos', label: 'Inativos', phrase: 'membro inativo' },
  { value: 'todos', label: 'Todos', phrase: 'cadastro' },
];
type Consent = 'todos' | 'pendente' | 'dado';
const PAGE = 50;

export default function Pessoas() {
  const viewer = useViewer();
  const q = useAppData();
  const action = canEditPerson(viewer) ? <Button kind="primary" main label="Nova pessoa" onPress={() => router.push('/pessoas/nova')} /> : undefined;
  if (!q.data) {
    return (
      <Page title="Pessoas" action={action}>
        <DataState error={q.error} reload={q.reload} what="a lista de pessoas" />
      </Page>
    );
  }
  return <Lista d={q.data} action={action} />;
}

function Lista({ d, action }: { d: AppData; action?: React.ReactNode }) {
  const viewer = useViewer();
  const [text, setText] = useState('');
  const [tipo, setTipo] = useState<Tipo>('ativos');
  const [ministry, setMinistry] = useState<string>('todos');
  const [consent, setConsent] = useState<Consent>('todos');
  const [more, setMore] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const visible = useMemo(
    () => d.people.filter((p) => (isVisitor(p) ? canSeeVisitor(viewer, p) : canSeePerson(viewer, p, d.ministries, d.services))),
    [d, viewer],
  );
  const ministryName = (id: string) => d.ministries.find((m) => m.id === id)?.name ?? '';

  const filtered = useMemo(() => {
    const n = normalize(text);
    const digits = onlyDigits(text);
    return visible
      .filter((p) => {
        if (tipo === 'ativos' && !(p.kind === 'membro' && p.active)) return false;
        if (tipo === 'congregados' && p.kind !== 'congregado') return false;
        if (tipo === 'visitantes' && p.kind !== 'visitante') return false;
        if (tipo === 'inativos' && p.active) return false;
        if (ministry !== 'todos' && !p.ministries.some((m) => m.ministryId === ministry)) return false;
        if (consent === 'pendente' && p.consent.status === 'dado') return false;
        if (consent === 'dado' && p.consent.status !== 'dado') return false;
        if (n && !normalize(p.name).includes(n) && !(digits.length >= 3 && onlyDigits(p.phone ?? '').includes(digits))) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [visible, text, tipo, ministry, consent]);

  // primeiro uso: nenhum cadastro além da equipe que usa o sistema
  const staff = new Set(Object.values(USERS).map((u) => u.personId));
  if (!d.people.some((p) => !staff.has(p.id))) return <Vazio action={action} />;

  const activeMembers = visible.filter((p) => p.kind === 'membro' && p.active).length;
  const W = startOfWeek(todayDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(W, i));
  const birthdays = visible
    .filter((p) => p.active && p.birthDate && week.some((day) => day.slice(5) === p.birthDate!.slice(5)))
    .map((p) => ({ p, day: week.find((day) => day.slice(5) === p.birthDate!.slice(5))! }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const filtersOn = text || tipo !== 'ativos' || ministry !== 'todos' || consent !== 'todos';
  const clear = () => {
    setText('');
    setTipo('ativos');
    setMinistry('todos');
    setConsent('todos');
  };
  const tipoPhrase = TIPOS.find((t) => t.value === tipo)!.phrase;

  return (
    <Page
      title="Pessoas"
      subtitle={viewer.profile === 'lider' ? `${fmtInt(visible.length)} pessoas dos seus ministérios e da sua célula` : `${fmtInt(activeMembers)} membros ativos · ${fmtInt(visible.length)} cadastros`}
      action={action}
    >
      {birthdays.length ? (
        <Txt v="small" muted>
          Aniversariantes da semana: {birthdays.map(({ p, day }) => `${firstName(p.name)} (${weekdayShort(day).toLowerCase()})`).join(', ')}
        </Txt>
      ) : null}
      <View style={{ gap: 12 }}>
        <Field label="Filtrar por nome ou telefone" value={text} onChangeText={(s) => { setText(s); setLimit(PAGE); }} placeholder="Ex.: Raimunda ou 99412" returnKeyType="search" />
        <Choice<Tipo> label="Tipo" value={tipo} onChange={(t) => { setTipo(t); setLimit(PAGE); }} options={TIPOS} />
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
          <TextLink small label={more ? 'Menos filtros' : 'Mais filtros: ministério e consentimento'} onPress={() => setMore((m) => !m)} />
          {filtersOn ? <TextLink small label="Limpar" onPress={clear} /> : null}
        </View>
        {more ? (
          <>
            <Choice<string> label="Ministério" value={ministry} onChange={setMinistry} options={[{ value: 'todos', label: 'Todos' }, ...d.ministries.map((m) => ({ value: m.id, label: m.name }))]} />
            <Choice<Consent>
              label="Consentimento LGPD"
              value={consent}
              onChange={setConsent}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'pendente', label: 'Pendente' },
                { value: 'dado', label: 'Dado' },
              ]}
            />
          </>
        ) : null}
      </View>

      <View>
        <Txt v="small" muted tabular style={{ paddingBottom: 8 }}>
          {fmtInt(filtered.length)} {filtered.length === 1 ? 'pessoa' : 'pessoas'}
        </Txt>
        {filtered.length === 0 ? (
          <EmptyLine>
            <Txt>
              Nenhum {tipoPhrase}
              {text ? ` com “${text.trim()}”` : ''}
              {ministry !== 'todos' ? ` em ${ministryName(ministry)}` : ''}
              {consent !== 'todos' ? ` com consentimento ${consent}` : ''}.
            </Txt>
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <TextLink small label="Limpar filtros" onPress={clear} />
              {text && (tipo !== 'todos' || ministry !== 'todos' || consent !== 'todos') ? (
                <TextLink
                  small
                  label={`Buscar “${text.trim()}” em todos`}
                  onPress={() => {
                    setTipo('todos');
                    setMinistry('todos');
                    setConsent('todos');
                  }}
                />
              ) : null}
            </View>
          </EmptyLine>
        ) : (
          filtered.slice(0, limit).map((p, i) => <PessoaRow key={p.id} p={p} first={i === 0} ministryName={ministryName} />)
        )}
        {filtered.length > limit ? (
          <View style={{ paddingTop: 12 }}>
            <Button label={`Mostrar mais ${Math.min(PAGE, filtered.length - limit)}`} onPress={() => setLimit((l) => l + PAGE)} />
          </View>
        ) : null}
      </View>
    </Page>
  );
}

function PessoaRow({ p, first, ministryName }: { p: Person; first: boolean; ministryName: (id: string) => string }) {
  const last = p.presence.length ? [...p.presence].sort().at(-1)! : null;
  const ms = p.ministries.map((m) => ministryName(m.ministryId)).filter(Boolean);
  return (
    <Row
      first={first}
      title={p.name}
      subtitle={ms.length ? ms.join(', ') : p.title ?? 'Nenhum ministério'}
      right={<Txt v="small" muted tabular align="right">{last ? fmtDayMonth(last) : '—'}</Txt>}
      accessibilityLabel={`${p.name}. ${ms.join(', ') || 'Nenhum ministério'}. Última presença: ${last ? fmtDayMonth(last) : 'sem registro'}`}
      onPress={() => router.push(isVisitor(p) ? `/visitantes/${p.id}` : `/pessoas/${p.id}`)}
    />
  );
}

/** Primeiro uso: explica e oferece importar planilha. */
function Vazio({ action }: { action?: React.ReactNode }) {
  return (
    <Page title="Pessoas" subtitle="Nenhum cadastro ainda" action={action}>
      <View style={{ gap: 8 }}>
        <Txt w={500}>Comece pelos cadastros que a igreja já tem</Txt>
        <Txt muted>Importe a planilha de membros em Excel (salva como CSV). Antes de gravar, você confere como cada coluna foi lida; nada é salvo sem revisão.</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Button kind="primary" label="Importar planilha" onPress={() => router.push('/configuracao-inicial/importar')} />
        <Button label="Cadastrar uma pessoa" onPress={() => router.push('/pessoas/nova')} />
      </View>
      <View>
        <Detail label="Colunas reconhecidas">Nome, telefone, e-mail, data de nascimento, endereço, ministério, data de batismo</Detail>
        <Detail label="Privacidade">Os dados ficam visíveis só para pastor e secretaria até você definir os perfis.</Detail>
      </View>
    </Page>
  );
}
