import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Choice } from '@/components/Field';
import { NotFound } from '@/components/NoAccess';
import { Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { Slot } from '@/data/types';
import { AppData, useAppData } from '@/data/useAppData';
import { findActivity, scheduleStatus } from '@/domain/activities';
import { canEditMinistry } from '@/domain/permissions';
import { fmtDayShort, fmtTime, weekdayShort, fmtDayMonth } from '@/lib/dates';
import { firstName, isMobilePhone, whatsappLink } from '@/lib/format';
import { publicUrl } from '@/lib/links';
import { colors } from '@/theme/tokens';

export default function Escala() {
  const { id, cultoId } = useLocalSearchParams<{ id: string; cultoId: string }>();
  const q = useAppData();
  if (!q.data) {
    return (
      <Page back={`/ministerios/${id}`} title="Escala">
        <DataState error={q.error} reload={q.reload} what="a escala" />
      </Page>
    );
  }
  const d = q.data;
  const m = d.ministries.find((x) => x.id === id);
  const a = findActivity(cultoId, d.services, d.events);
  if (!m || !a) return <NotFound back="/ministerios" what="Escala" />;
  return <EscalaView d={d} ministryId={m.id} activityId={a.id} />;
}

function EscalaView({ d, ministryId, activityId }: { d: AppData; ministryId: string; activityId: string }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast, confirm } = useFeedback();
  const [choosing, setChoosing] = useState<string | null>(null);
  const m = d.ministries.find((x) => x.id === ministryId)!;
  const a = findActivity(activityId, d.services, d.events)!;
  const schedule = d.schedules.find((s) => s.ministryId === ministryId && s.activityId === activityId);
  const edit = canEditMinistry(viewer, m);
  const back = `/ministerios/${m.id}` as const;

  if (!schedule) {
    return (
      <Page back={back} title={a.title} subtitle={`${m.name} · ${fmtDayShort(a.date)} · ${fmtTime(a.time)}`}>
        <Txt muted>Ainda não há escala de {m.name} para esta atividade.</Txt>
        {edit ? <Button kind="primary" label="Criar escala" onPress={() => repo.ensureSchedule(m.id, a.id, viewer.userId)} /> : null}
      </Page>
    );
  }
  const st = scheduleStatus(schedule);
  const scheduled = new Set(schedule.slots.map((s) => s.personId).filter(Boolean));
  const candidates = m.memberIds.filter((pid) => !scheduled.has(pid)).map((pid) => d.byId.get(pid)).filter((p): p is NonNullable<typeof p> => !!p).sort((x, y) => x.name.localeCompare(y.name, 'pt-BR'));
  const reh = schedule.rehearsal;
  const subtitle = [`${m.name} · ${fmtDayShort(a.date)} · ${fmtTime(a.time)}`, `${st.confirmed} de ${st.total} confirmados`, reh ? `ensaio ${weekdayShort(reh.date).toLowerCase()} ${fmtDayMonth(reh.date)}, ${fmtTime(reh.time)}` : null].filter(Boolean).join(' · ');
  const waiting = schedule.slots.filter((s) => s.personId && s.status === 'aguardando');

  const assign = async (slot: Slot, personId: string) => {
    setChoosing(null);
    const undo = await repo.assignSlot(schedule.id, slot.id, personId, viewer.userId);
    toast(`${d.name(personId)} escalado para ${slot.role}`, undo);
  };
  const remove = async (slot: Slot) => {
    const ok = await confirm({ title: 'Remover da escala?', body: `${d.name(slot.personId)} deixa de estar escalado para ${slot.role}.`, confirm: 'Remover' });
    if (!ok) return;
    const undo = await repo.clearSlot(schedule.id, slot.id, viewer.userId);
    toast('Removido da escala', undo);
  };
  const sendLink = async (slot: Slot) => {
    const p = d.byId.get(slot.personId!);
    if (!p?.phone) return;
    const msg = `Oi, ${firstName(p.name)}! Você foi escalado para ${slot.role} no ${a.title.toLowerCase()} de ${fmtDayShort(a.date).toLowerCase()}, às ${fmtTime(a.time)}. Confirme por aqui: ${publicUrl(`/escala/${slot.id}`)}`;
    await Linking.openURL(whatsappLink(p.phone, msg));
  };
  const remind = async () => {
    const n = await repo.sendReminder(schedule.id, viewer.userId);
    toast(n ? `Lembrete enviado para ${n} ${n === 1 ? 'pessoa' : 'pessoas'}` : 'Ninguém aguardando resposta');
  };

  return (
    <Page
      back={back}
      title={a.title}
      subtitle={subtitle}
      action={edit && waiting.length ? <Button kind="primary" main label="Enviar lembrete" onPress={remind} /> : undefined}
    >
      <View>
        {schedule.slots.map((slot) => {
          const empty = !slot.personId;
          const status =
            empty ? <Pending v="small">Ninguém escalado</Pending>
            : slot.status === 'confirmado' ? <Txt v="small" muted>Confirmado</Txt>
            : slot.status === 'aguardando' ? <Pending v="small">Aguardando</Pending>
            : <Pending v="small">Recusou{slot.message ? `: “${slot.message}”` : ''}</Pending>;
          return (
            <View key={slot.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2, gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
                <Txt v="label" color={colors.inkHead} style={{ width: 96, paddingTop: 3 }}>
                  {slot.role}
                </Txt>
                <View style={{ flex: 1, gap: 2 }}>
                  {empty ? null : <Txt w={500}>{d.name(slot.personId)}</Txt>}
                  {status}
                </View>
              </View>
              {edit ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, paddingLeft: 112 }}>
                  {empty || slot.status === 'recusou' ? <TextLink small label="Escalar" accessibilityLabel={`Escalar alguém para ${slot.role}`} onPress={() => setChoosing(choosing === slot.id ? null : slot.id)} /> : null}
                  {!empty && slot.status === 'aguardando' && d.byId.get(slot.personId!)?.phone && isMobilePhone(d.byId.get(slot.personId!)!.phone!) ? <TextLink small label="Enviar link pelo WhatsApp" onPress={() => sendLink(slot)} /> : null}
                  {!empty && slot.status === 'aguardando' ? <TextLink small label="Abrir link de confirmação" onPress={() => router.push(`/escala/${slot.id}`)} /> : null}
                  {!empty ? <TextLink small label="Remover" accessibilityLabel={`Remover ${d.name(slot.personId)} da escala`} onPress={() => remove(slot)} /> : null}
                </View>
              ) : null}
              {choosing === slot.id ? (
                <View style={{ paddingLeft: 112, gap: 8 }}>
                  {candidates.length ? (
                    <Choice<string> label={`Quem vai em ${slot.role}?`} layout="list" value={null} onChange={(pid) => assign(slot, pid)} options={candidates.map((p) => ({ value: p.id, label: p.name, hint: p.ministries.find((x) => x.ministryId === m.id)?.role }))} />
                  ) : (
                    <Txt muted>Toda a equipe já está nesta escala.</Txt>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      {!edit ? (
        <Txt v="small" muted>
          Só {d.name(m.leaderId)} e a secretaria alteram esta escala.
        </Txt>
      ) : null}
      {reh || schedule.arrival ? (
        <Section title="Combinados">
          {schedule.arrival ? <Txt>Chegar às {fmtTime(schedule.arrival)}</Txt> : null}
          {reh ? (
            <Txt>
              Ensaio: {fmtDayShort(reh.date)} · {fmtTime(reh.time)} · {reh.location}
            </Txt>
          ) : null}
        </Section>
      ) : null}
    </Page>
  );
}
