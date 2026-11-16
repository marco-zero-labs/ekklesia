import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Row } from '@/components/List';
import { NotFound } from '@/components/NoAccess';
import { Detail, goBack, Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { useAppData } from '@/data/useAppData';
import { findActivity, scheduleStatus } from '@/domain/activities';
import { canEditAgenda, canRecordAttendance } from '@/domain/permissions';
import { fmtDayShort, fmtTime, todayDay, weekdayName } from '@/lib/dates';

export default function Atividade() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewer = useViewer();
  const repo = useRepo();
  const { toast, confirm } = useFeedback();
  const q = useAppData();
  if (!q.data) {
    return (
      <Page back="/agenda" title="Atividade">
        <DataState error={q.error} reload={q.reload} what="a atividade" />
      </Page>
    );
  }
  const d = q.data;
  const a = findActivity(decodeURIComponent(id), d.services, d.events);
  if (!a) return <NotFound back="/agenda" what="Atividade" />;
  const today = todayDay();
  const service = d.services.find((s) => s.id === a.serviceId);
  const ministry = d.ministries.find((m) => m.id === a.ministryId);
  const schedules = d.schedules.filter((s) => s.activityId === a.id);
  const record = d.attendance.find((r) => r.activityId === a.id);
  const canRecord = a.date <= today && canRecordAttendance(viewer, a, d.ministries);

  const remove = async () => {
    const ok = await confirm({ title: 'Remover atividade?', body: `${a.title} sai da agenda${schedules.length ? ' junto com as escalas' : ''}.`, confirm: 'Remover' });
    if (!ok) return;
    const undo = await repo.deleteEvent(a.id, viewer.userId);
    goBack('/agenda');
    toast('Atividade removida', undo);
  };

  return (
    <Page
      back="/agenda"
      title={a.title}
      subtitle={`${fmtDayShort(a.date)} · ${fmtTime(a.time)} · ${a.location}`}
      action={canRecord ? <Button kind="primary" main label={record?.done ? 'Ver frequência' : 'Registrar frequência'} onPress={() => router.push(a.mode === 'chamada' ? `/frequencia/chamada/${a.id}` : `/frequencia/contagem?atividade=${encodeURIComponent(a.id)}`)} /> : undefined}
    >
      <View>
        <Detail label="Quando">
          <Txt tabular>
            {fmtDayShort(a.date)} · {fmtTime(a.time)}
            {a.source === 'event' && d.events.find((e) => e.id === a.id)?.endTime ? ` às ${fmtTime(d.events.find((e) => e.id === a.id)!.endTime!)}` : ''}
          </Txt>
        </Detail>
        <Detail label="Local">{a.location}</Detail>
        {service ? <Detail label="Repete">{`Toda ${weekdayName(service.weekday).toLowerCase()}${service.weekday === 0 || service.weekday === 6 ? '' : '-feira'} às ${fmtTime(service.time)}`.replace('Toda domingo', 'Todo domingo').replace('Toda sábado', 'Todo sábado')}</Detail> : null}
        {ministry ? <Detail label="Ministério">{ministry.name}</Detail> : null}
        {a.info ? <Detail label="Inscrições">{a.info}</Detail> : null}
        {a.note ? <Detail label="Observação">{a.note}</Detail> : null}
        <Detail label="Frequência">
          <Txt>
            {a.mode === 'contagem' ? 'Contagem' : 'Chamada nominal'}
            {record ? <Txt muted>{` · ${record.present} presentes${record.done ? '' : ' (em andamento)'}`}</Txt> : a.date <= today ? <Txt muted> · ainda não registrada</Txt> : null}
          </Txt>
        </Detail>
      </View>

      <Section title="Escalas">
        {schedules.length === 0 ? (
          <Txt muted>Nenhuma escala para esta atividade.</Txt>
        ) : (
          <View>
            {schedules.map((s) => {
              const m = d.ministries.find((x) => x.id === s.ministryId);
              const st = scheduleStatus(s);
              return (
                <Row
                  key={s.id}
                  title={m?.name ?? ''}
                  subtitle={`${st.confirmed} de ${st.total} confirmados`}
                  right={st.pending ? <Pending v="small" align="right">{st.text}</Pending> : <Txt v="small" muted align="right">{st.text}</Txt>}
                  onPress={() => router.push(`/ministerios/${s.ministryId}/escala/${a.id}`)}
                />
              );
            })}
          </View>
        )}
      </Section>

      {a.source === 'event' && canEditAgenda(viewer) ? <TextLink label="Remover atividade" onPress={remove} /> : null}
    </Page>
  );
}
