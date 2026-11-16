import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { Dots, LockIcon } from '@/components/Chart';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Field } from '@/components/Field';
import { Row } from '@/components/List';
import { NoAccess, NotFound } from '@/components/NoAccess';
import { Detail, Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { Person } from '@/data/types';
import { AppData, isVisitor, useAppData } from '@/data/useAppData';
import { consentMessage, consentText } from '@/domain/consent';
import { canEditPastoralNote, canEditPerson, canSeePastoralNote, canSeePerson } from '@/domain/permissions';
import { addDays, fmtDayMonth, fmtDayMonthYear, fmtMonthYear, fmtWhen, lastSunday, todayDay } from '@/lib/dates';
import { isMobilePhone, whatsappLink } from '@/lib/format';
import { publicUrl } from '@/lib/links';
import { colors } from '@/theme/tokens';

export default function Pessoa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewer = useViewer();
  const q = useAppData();
  if (!q.data) {
    return (
      <Page back="/pessoas" title="Pessoa">
        <DataState error={q.error} reload={q.reload} what="a pessoa" />
      </Page>
    );
  }
  const p = q.data.byId.get(id);
  if (!p) return <NotFound back="/pessoas" what="Cadastro" />;
  if (!canSeePerson(viewer, p, q.data.ministries, q.data.services)) return <NoAccess back="/pessoas" what="este cadastro" />;
  return <PessoaView p={p} d={q.data} />;
}

function PessoaView({ p, d }: { p: Person; d: AppData }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const today = todayDay();
  const S = lastSunday(today);
  const sundays = Array.from({ length: 8 }, (_, i) => addDays(S, -7 * (7 - i)));
  const presentFlags = sundays.map((s) => p.presence.includes(s));
  const presentCount = presentFlags.filter(Boolean).length;
  const family = p.familyId ? d.people.filter((x) => x.familyId === p.familyId && x.id !== p.id) : [];
  const familyName = d.families.find((f) => f.id === p.familyId)?.name;
  const consent = consentText(p.consent);
  const showNote = canSeePastoralNote(viewer);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(p.pastoralNote ?? '');

  // abrir a nota pastoral fica registrado na auditoria (uma vez por visita à página)
  const logged = useRef(false);
  useEffect(() => {
    if (showNote && p.pastoralNote && !logged.current) {
      logged.current = true;
      repo.logAudit('Abriu nota pastoral', p.name, viewer.userId, p.id);
    }
  }, [showNote, p.pastoralNote, p.name, p.id, repo, viewer.userId]);

  const subtitle = [p.kind === 'membro' ? (p.memberSince ? `Membro desde ${fmtMonthYear(p.memberSince)}` : 'Membro') : p.kind === 'congregado' ? 'Congregado' : 'Visitante', p.title, !p.active ? 'Inativo' : null]
    .filter(Boolean)
    .join(' · ');

  const sendConsent = async () => {
    if (!p.phone) return;
    await Linking.openURL(whatsappLink(p.phone, consentMessage(p.name, d.church.name, publicUrl(`/termo?p=${p.id}`))));
    const undo = await repo.requestConsent(p.id, viewer.userId);
    toast('Pedido de consentimento enviado', undo);
  };
  const saveNote = async () => {
    const undo = await repo.updatePerson(p.id, { pastoralNote: note.trim() || undefined }, viewer.userId, 'Alterou nota pastoral');
    setEditingNote(false);
    toast('Nota pastoral salva', undo);
  };

  return (
    <Page back="/pessoas" title={p.name} subtitle={subtitle} action={canEditPerson(viewer) ? <Button label="Editar" onPress={() => router.push(`/pessoas/${p.id}/editar`)} /> : undefined}>
      {isVisitor(p) ? <TextLink label="Ver acompanhamento de visitante →" onPress={() => router.push(`/visitantes/${p.id}`)} /> : null}

      <View>
        <Detail label="Telefone">
          {p.phone ? (
            <Txt tabular>
              {p.phone}
              <Txt muted>{isMobilePhone(p.phone) ? ' · celular' : ' · fixo'}</Txt>
            </Txt>
          ) : (
            <Txt muted>Não informado</Txt>
          )}
        </Detail>
        <Detail label="E-mail">{p.email ? <Txt>{p.email}</Txt> : <Txt muted>Não informado</Txt>}</Detail>
        <Detail label="Nascimento">{p.birthDate ? <Txt tabular>{fmtDayMonthYear(p.birthDate)}</Txt> : <Txt muted>Não informado</Txt>}</Detail>
        <Detail label="Endereço">{p.address ? <Txt>{p.address}</Txt> : <Txt muted>Não informado</Txt>}</Detail>
        <Detail label="Consentimento LGPD">
          {consent.pending ? <Pending>{consent.text}</Pending> : <Txt>{consent.text}</Txt>}
          {consent.note ? (
            <Txt v="small" muted>
              {consent.note}
            </Txt>
          ) : null}
          {p.consent.status !== 'dado' && p.phone && canEditPerson(viewer) ? <TextLink small label="Enviar pedido de consentimento" onPress={sendConsent} /> : null}
        </Detail>
      </View>

      {family.length ? (
        <Section title={familyName ?? 'Família'}>
          <View>
            {family.map((f) => (
              <Row key={f.id} title={f.name} subtitle={f.familyRole} onPress={() => router.push(isVisitor(f) ? `/visitantes/${f.id}` : `/pessoas/${f.id}`)} />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Ministérios">
        {p.ministries.length ? (
          <View>
            {p.ministries.map((m) => {
              const ministry = d.ministries.find((x) => x.id === m.ministryId);
              if (!ministry) return null;
              return <Row key={m.ministryId} title={ministry.name} subtitle={[ministry.leaderId === p.id ? 'Líder' : null, m.role && m.role !== 'Líder' ? m.role : null].filter(Boolean).join(' · ') || undefined} onPress={() => router.push(`/ministerios/${ministry.id}`)} />;
            })}
          </View>
        ) : (
          <Txt muted>Nenhum ministério.</Txt>
        )}
      </Section>

      <Section title="Participação">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Dots values={presentFlags} label={`Presente em ${presentCount} dos últimos 8 domingos`} />
          <Txt tabular>
            {presentCount} de 8 <Txt muted>domingos</Txt>
          </Txt>
        </View>
        <Txt v="small" muted tabular>
          {fmtDayMonth(sundays[0])} a {fmtDayMonth(sundays[7])}
        </Txt>
      </Section>

      {showNote ? (
        <Section
          title="Nota pastoral"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LockIcon />
              <Txt v="small" muted>
                visível só para pastor e secretaria
              </Txt>
            </View>
          }
        >
          {editingNote ? (
            <View style={{ gap: 8 }}>
              <Field label="Nota pastoral" value={note} onChangeText={setNote} multiline />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button kind="primary" label="Salvar nota" onPress={saveNote} />
                <Button kind="text" label="Cancelar" onPress={() => { setNote(p.pastoralNote ?? ''); setEditingNote(false); }} />
              </View>
            </View>
          ) : (
            <>
              {p.pastoralNote ? <Txt>{p.pastoralNote}</Txt> : <Txt muted>Sem nota.</Txt>}
              {canEditPastoralNote(viewer) ? <TextLink small label={p.pastoralNote ? 'Editar nota' : 'Escrever nota'} onPress={() => setEditingNote(true)} /> : null}
            </>
          )}
        </Section>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line2 }}>
        <Txt v="small" muted>
          Alterado por {d.name(p.updatedById)} em {fmtWhen(p.updatedAt, today).replace(/^Hoje/, 'hoje').replace(/^Ontem/, 'ontem')}
        </Txt>
        <TextLink small label="· Histórico" accessibilityLabel="Histórico de alterações" onPress={() => router.push(`/pessoas/${p.id}/historico`)} />
      </View>
    </Page>
  );
}
