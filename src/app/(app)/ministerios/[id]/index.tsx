import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { EmptyLine, Row } from '@/components/List';
import { NotFound } from '@/components/NoAccess';
import { Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { isVisitor, useAppData } from '@/data/useAppData';
import { activitiesBetween, findActivity, scheduleStatus } from '@/domain/activities';
import { canEditMinistry, canSeePerson } from '@/domain/permissions';
import { addDays, fmtDayShort, fmtTime, todayDay } from '@/lib/dates';

export default function Ministerio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const q = useAppData();
  if (!q.data) {
    return (
      <Page back="/ministerios" title="Ministério">
        <DataState error={q.error} reload={q.reload} what="o ministério" />
      </Page>
    );
  }
  const d = q.data;
  const m = d.ministries.find((x) => x.id === id);
  if (!m) return <NotFound back="/ministerios" what="Ministério" />;
  const today = todayDay();
  const edit = canEditMinistry(viewer, m);
  const schedules = d.schedules
    .filter((s) => s.ministryId === m.id)
    .map((s) => ({ s, a: findActivity(s.activityId, d.services, d.events) }))
    .filter((x) => x.a && x.a.date >= today)
    .sort((x, y) => (x.a!.date + x.a!.time).localeCompare(y.a!.date + y.a!.time));
  // cultos das próximas 2 semanas ainda sem escala deste ministério
  const withoutSchedule = activitiesBetween(d.services.filter((s) => s.kind === 'culto'), d.events.filter((e) => e.ministryId === m.id), today, addDays(today, 14)).filter(
    (a) => !schedules.some((x) => x.a!.id === a.id),
  );

  return (
    <Page back="/ministerios" title={m.name} subtitle={`Líder: ${d.name(m.leaderId)} · ${m.memberIds.length} pessoas`}>
      <Section title="Próximas escalas">
        {schedules.length === 0 ? (
          <EmptyLine>
            <Txt muted>Nenhuma escala marcada.</Txt>
          </EmptyLine>
        ) : (
          <View>
            {schedules.map(({ s, a }) => {
              const st = scheduleStatus(s);
              return (
                <Row
                  key={s.id}
                  title={a!.title}
                  subtitle={`${fmtDayShort(a!.date)} · ${fmtTime(a!.time)} · ${st.confirmed} de ${st.total} confirmados`}
                  right={st.pending ? <Pending v="small" align="right">{st.text}</Pending> : <Txt v="small" muted align="right">{st.text}</Txt>}
                  onPress={() => router.push(`/ministerios/${m.id}/escala/${a!.id}`)}
                />
              );
            })}
          </View>
        )}
        {edit && withoutSchedule.length ? (
          <View style={{ gap: 4, paddingTop: 8 }}>
            <Txt v="label">Sem escala nas próximas 2 semanas</Txt>
            {withoutSchedule.slice(0, 6).map((a) => (
              <Row
                key={a.id}
                title={a.title}
                subtitle={`${fmtDayShort(a.date)} · ${fmtTime(a.time)}`}
                right={<Txt v="small" muted>Criar escala</Txt>}
                accessibilityLabel={`Criar escala de ${m.name} para ${a.title}, ${fmtDayShort(a.date)}`}
                onPress={async () => {
                  await repo.ensureSchedule(m.id, a.id, viewer.userId);
                  router.push(`/ministerios/${m.id}/escala/${a.id}`);
                  toast('Escala criada');
                }}
              />
            ))}
          </View>
        ) : null}
      </Section>

      <Section title="Equipe" right={<Txt v="small" muted tabular>{`${m.memberIds.length} pessoas`}</Txt>}>
        <View>
          {[...m.memberIds]
            .map((pid) => d.byId.get(pid))
            .filter((p): p is NonNullable<typeof p> => !!p)
            .sort((a, b) => (a.id === m.leaderId ? -1 : b.id === m.leaderId ? 1 : a.name.localeCompare(b.name, 'pt-BR')))
            .map((p) => {
              const link = p.ministries.find((x) => x.ministryId === m.id);
              const can = canSeePerson(viewer, p, d.ministries, d.services);
              return (
                <Row
                  key={p.id}
                  title={p.name}
                  subtitle={p.id === m.leaderId ? 'Líder' : link?.role}
                  onPress={can ? () => router.push(isVisitor(p) ? `/visitantes/${p.id}` : `/pessoas/${p.id}`) : undefined}
                />
              );
            })}
        </View>
      </Section>
    </Page>
  );
}
