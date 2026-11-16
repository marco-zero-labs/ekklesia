import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { EmptyLine, Row } from '@/components/List';
import { Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { AppData, isVisitor, useAppData } from '@/data/useAppData';
import { findActivity, sundaySummary, summaryText } from '@/domain/activities';
import { byDue, isWaiting } from '@/domain/followup';
import { canSeeVisitor } from '@/domain/permissions';
import { dueLabel, fmtDayLong, fmtDayShort, fmtTime, greeting, lastSunday, todayDay } from '@/lib/dates';
import { firstName, plural } from '@/lib/format';
import { colors, layout } from '@/theme/tokens';

/**
 * Início: só o que decide a ação de hoje.
 * Saudação, quantas pessoas esperam contato, as 5 mais atrasadas e o resumo do domingo.
 */
export default function Inicio() {
  const viewer = useViewer();
  const q = useAppData();
  const me = q.data?.byId.get(viewer.userId);
  const title = `${greeting()}${me ? `, ${firstName(me.name)}` : ''}`;
  if (!q.data) {
    return (
      <Page title={title} maxWidth={layout.home}>
        <DataState error={q.error} reload={q.reload} what="o início" />
      </Page>
    );
  }
  const d = q.data;
  const today = todayDay();
  const mine = viewer.profile === 'lider';
  const visible = d.people.filter((p) => isVisitor(p) && canSeeVisitor(viewer, p) && (!mine || p.followUp?.responsibleId === viewer.userId));
  const waiting = visible.filter((p) => isWaiting(p.followUp, today)).sort(byDue);
  const list = mine ? [...visible].sort(byDue).slice(0, 5) : waiting.slice(0, 5);

  return (
    <Page title={title} subtitle={waiting.length ? `${plural(waiting.length, 'pessoa esperando', 'pessoas esperando')} contato` : 'Ninguém esperando contato hoje'} maxWidth={layout.home}>
      <View style={{ gap: 8 }}>
        {mine ? (
          <Txt w={600} style={{ fontSize: 14, lineHeight: 20 }} accessibilityRole="header">
            Seus visitantes
          </Txt>
        ) : null}
        {list.length === 0 ? (
          <EmptyLine>
            <Txt muted>{mine ? 'Nenhum visitante atribuído a você.' : 'Todos os contatos estão em dia.'}</Txt>
          </EmptyLine>
        ) : (
          <View>
            {list.map((p, i) => {
              const due = p.followUp?.nextContact ? dueLabel(p.followUp.nextContact, today) : null;
              return (
                <Row
                  key={p.id}
                  first={i === 0}
                  title={p.name}
                  subtitle={due ? due.overdue ? <Pending v="small">{due.text}</Pending> : <Txt v="small" muted>{due.text}</Txt> : <Txt v="small" muted>Sem próximo contato</Txt>}
                  accessibilityLabel={`${p.name}, ${due?.text ?? 'sem próximo contato'}`}
                  onPress={() => router.push(`/visitantes/${p.id}`)}
                />
              );
            })}
          </View>
        )}
        <View style={{ paddingTop: 8 }}>
          <TextLink label={mine ? 'Ver todos os seus visitantes →' : 'Ver todos os visitantes →'} onPress={() => router.push('/visitantes')} />
        </View>
      </View>

      {mine ? <SuasEscalas d={d} /> : null}

      <SundayLine d={d} />
    </Page>
  );
}

/** Rodapé discreto (12px): "Domingo, 15 nov · 287 à noite · 198 de manhã · 6 visitantes". */
function SundayLine({ d }: { d: AppData }) {
  const S = lastSunday(todayDay());
  const sum = sundaySummary(d.attendance, S);
  if (!sum.night && !sum.morning) return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${fmtDayLong(S)}: ${summaryText(sum)}. Abrir frequência`}
      onPress={() => router.push('/frequencia')}
      style={(s) => ({ paddingTop: 24, minHeight: 44, justifyContent: 'center', opacity: s.pressed ? 0.7 : 1 })}
    >
      {(s) => (
        <Txt v="small" tabular color={(s as { hovered?: boolean }).hovered ? colors.ink : colors.ink2}>
          {fmtDayLong(S)} · {summaryText(sum)}
        </Txt>
      )}
    </Pressable>
  );
}

/** Líder: as 2 próximas escalas, com Confirmar e Não posso. */
function SuasEscalas({ d }: { d: AppData }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const today = todayDay();
  const mine = d.schedules
    .flatMap((s) =>
      s.slots
        .filter((x) => x.personId === viewer.userId)
        .map((slot) => ({ slot, schedule: s, activity: findActivity(s.activityId, d.services, d.events) })),
    )
    .filter((x) => x.activity && x.activity.date >= today)
    .sort((a, b) => (a.activity!.date + a.activity!.time).localeCompare(b.activity!.date + b.activity!.time))
    .slice(0, 2);

  return (
    <Section title="Suas escalas">
      {mine.length === 0 ? (
        <Txt muted>Você não está escalado nos próximos dias.</Txt>
      ) : (
        mine.map(({ slot, schedule, activity }) => {
          const ministry = d.ministries.find((m) => m.id === schedule.ministryId);
          const respond = async (r: 'confirmado' | 'recusou') => {
            await repo.respondSlot(slot.id, r);
            toast(r === 'confirmado' ? 'Escala confirmada' : `Avisamos ${firstName(d.name(ministry?.leaderId))} que você não pode`, () => repo.respondSlot(slot.id, 'aguardando'));
          };
          return (
            <View key={slot.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line2, gap: 8 }}>
              <View style={{ gap: 2 }}>
                <Txt w={500} tabular>
                  {fmtDayShort(activity!.date)} · {fmtTime(activity!.time)}
                </Txt>
                <Txt v="small" muted>
                  {ministry?.name} · {activity!.title}
                  {slot.role !== ministry?.name ? ` · ${slot.role}` : ''}
                </Txt>
                {slot.status === 'aguardando' ? (
                  <Pending v="small">Aguardando sua resposta</Pending>
                ) : (
                  <Txt v="small" muted>
                    {slot.status === 'confirmado' ? 'Confirmada' : 'Você avisou que não pode'}
                  </Txt>
                )}
              </View>
              {slot.status === 'aguardando' ? (
                <View style={{ flexDirection: 'row', gap: 8, maxWidth: 360 }}>
                  <Button label="Não posso" onPress={() => respond('recusou')} style={{ flex: 1 }} block />
                  <Button label="Confirmar" kind="primary" onPress={() => respond('confirmado')} style={{ flex: 1 }} block />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </Section>
  );
}
