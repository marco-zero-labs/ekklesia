import { router } from 'expo-router';
import { View } from 'react-native';
import { DataState } from '@/components/DataState';
import { Row } from '@/components/List';
import { Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useViewer } from '@/data/DataProvider';
import { Ministry } from '@/data/types';
import { AppData, useAppData } from '@/data/useAppData';
import { findActivity, scheduleStatus } from '@/domain/activities';
import { canEditMinistry } from '@/domain/permissions';
import { fmtDayShort, fmtTime, todayDay } from '@/lib/dates';
import { useLayout } from '@/theme/useLayout';

/** Próxima escala de um ministério (a partir de hoje). */
function nextSchedule(d: AppData, m: Ministry) {
  const today = todayDay();
  return d.schedules
    .filter((s) => s.ministryId === m.id)
    .map((s) => ({ s, a: findActivity(s.activityId, d.services, d.events) }))
    .filter((x) => x.a && x.a.date >= today)
    .sort((x, y) => (x.a!.date + x.a!.time).localeCompare(y.a!.date + y.a!.time))[0];
}

export default function Ministerios() {
  const viewer = useViewer();
  const { wide } = useLayout();
  const q = useAppData();
  if (!q.data) {
    return (
      <Page title="Ministérios">
        <DataState error={q.error} reload={q.reload} what="os ministérios" />
      </Page>
    );
  }
  const d = q.data;
  const serving = new Set(d.ministries.flatMap((m) => m.memberIds)).size;
  const today = todayDay();
  const mySlots = d.schedules
    .flatMap((s) => s.slots.filter((x) => x.personId === viewer.userId).map((slot) => ({ slot, s, a: findActivity(s.activityId, d.services, d.events) })))
    .filter((x) => x.a && x.a.date >= today)
    .sort((x, y) => (x.a!.date + x.a!.time).localeCompare(y.a!.date + y.a!.time));

  return (
    <Page title="Ministérios" subtitle={`${d.ministries.length} ministérios · ${serving} pessoas servindo`}>
      {viewer.profile === 'lider' ? (
        <Section title="Suas escalas">
          {mySlots.length === 0 ? (
            <Txt muted>Você não está escalado nos próximos dias.</Txt>
          ) : (
            <View>
              {mySlots.map(({ slot, s, a }) => {
                const m = d.ministries.find((x) => x.id === s.ministryId);
                return (
                  <Row
                    key={slot.id}
                    title={`${fmtDayShort(a!.date)} · ${fmtTime(a!.time)}`}
                    subtitle={slot.status === 'aguardando' ? <Pending v="small">{`${m?.name} · ${a!.title} · aguardando sua resposta`}</Pending> : `${m?.name} · ${a!.title} · ${slot.status === 'confirmado' ? 'confirmada' : 'você não pode'}`}
                    onPress={() => router.push(`/escala/${slot.id}`)}
                  />
                );
              })}
            </View>
          )}
        </Section>
      ) : null}
      <View>
        {d.ministries.map((m, i) => {
          const next = nextSchedule(d, m);
          const st = next ? scheduleStatus(next.s) : null;
          const when = next ? `${fmtDayShort(next.a!.date).replace(',', '')} · ${next.a!.title.replace(/^Culto de domingo – /, '').replace(/^Culto de /, '')}` : 'Sem escala marcada';
          const status = st ? st.pending ? <Pending v="small" align="right">{st.text}</Pending> : <Txt v="small" muted align="right">{st.text}</Txt> : null;
          return (
            <Row
              key={m.id}
              first={i === 0}
              title={m.name}
              subtitle={wide ? `Líder: ${d.name(m.leaderId)}` : <Txt v="small" muted>{`${d.name(m.leaderId)} · ${when}`}</Txt>}
              right={
                wide ? (
                  <>
                    <Txt v="small" muted tabular align="right">
                      {when}
                    </Txt>
                    {status}
                  </>
                ) : (
                  status
                )
              }
              accessibilityLabel={`${m.name}. Líder: ${d.name(m.leaderId)}. Próxima escala: ${when}${st ? `, ${st.text}` : ''}${canEditMinistry(viewer, m) ? '' : '. Só leitura'}`}
              onPress={() => router.push(`/ministerios/${m.id}`)}
            />
          );
        })}
      </View>
    </Page>
  );
}
