import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { LineChart } from '@/components/Chart';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Row } from '@/components/List';
import { Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { AppData, useAppData } from '@/data/useAppData';
import { priorAverage, seriesOf } from '@/domain/activities';
import { canExport } from '@/domain/permissions';
import { addDays, fmtDayMonth, fmtDayShort, lastSunday, todayDay } from '@/lib/dates';
import { toCsv } from '@/lib/csv';
import { saveTextFile } from '@/lib/download';
import { fmtDelta } from '@/lib/format';
import { colors } from '@/theme/tokens';

export default function Frequencia() {
  const q = useAppData();
  const action = <Button kind="primary" main label="Registrar frequência" onPress={() => router.push('/frequencia/contagem')} />;
  if (!q.data) {
    return (
      <Page title="Frequência" subtitle="Últimas 8 semanas" action={action}>
        <DataState error={q.error} reload={q.reload} what="a frequência" />
      </Page>
    );
  }
  return <View style={{ flex: 1 }}><Conteudo d={q.data} action={action} /></View>;
}

function Conteudo({ d, action }: { d: AppData; action: React.ReactNode }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const [limit, setLimit] = useState(12);
  const S = lastSunday(todayDay());
  const sundays = Array.from({ length: 8 }, (_, i) => addDays(S, -7 * (7 - i)));
  const value = (series: string, day: string) => d.attendance.find((a) => a.done && seriesOf(a.activityId) === series && a.date === day)?.present ?? null;
  const night = sundays.map((s) => value('s-noite', s));
  const morning = sundays.map((s) => value('s-manha', s));
  const avg = sundays.map((s) => {
    const rec = d.attendance.find((a) => a.done && seriesOf(a.activityId) === 's-noite' && a.date === s);
    return rec ? priorAverage(d.attendance, rec) : null;
  });
  const lastNight = d.attendance.find((a) => seriesOf(a.activityId) === 's-noite' && a.date === S);
  const lastMorning = d.attendance.find((a) => seriesOf(a.activityId) === 's-manha' && a.date === S);
  const dn = lastNight ? priorAverage(d.attendance, lastNight) : null;
  const dm = lastMorning ? priorAverage(d.attendance, lastMorning) : null;
  const summary = [
    lastNight ? `Noite, ${fmtDayMonth(S)}: ${lastNight.present}${dn != null ? ` (${fmtDelta(lastNight.present - dn)} vs. média)` : ''}` : null,
    lastMorning ? `Manhã: ${lastMorning.present}${dm != null ? ` (${fmtDelta(lastMorning.present - dm)})` : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const exportCsv = async () => {
    const rows = d.attendance.map((a) => [a.title, a.date, a.mode === 'contagem' ? 'Contagem' : 'Chamada', a.present, a.visitors, a.children, d.name(a.recordedById)]);
    await saveTextFile(`frequencia-${todayDay()}.csv`, toCsv([['Atividade', 'Data', 'Modo', 'Presentes', 'Visitantes', 'Crianças', 'Registrado por'], ...rows]), 'text/csv');
    await repo.logAudit('Exportou lista', `Frequência · ${d.attendance.length} registros`, viewer.userId);
    toast('Lista exportada');
  };

  return (
    <Page title="Frequência" subtitle="Últimas 8 semanas" action={action}>
      <Section title="Cultos de domingo">
        <LineChart
          labels={sundays.map(fmtDayMonth)}
          series={[
            { label: 'Noite', values: night, color: colors.petrol600, strong: true },
            { label: 'Manhã', values: morning, color: colors.chartCompare },
            { label: 'Média da noite, 4 semanas', values: avg, color: colors.petrol600, dashed: true },
          ]}
          summary={`Gráfico das últimas 8 semanas. Noite: ${night.map((v) => v ?? 'sem registro').join(', ')}. Manhã: ${morning.map((v) => v ?? 'sem registro').join(', ')}.`}
        />
        {summary ? (
          <Txt tabular muted>
            {summary}
          </Txt>
        ) : null}
      </Section>

      <Section title="Registros" right={canExport(viewer) ? <TextLink small label="Exportar" onPress={exportCsv} /> : undefined}>
        <View>
          {d.attendance.slice(0, limit).map((a) => {
            const avgA = a.done ? priorAverage(d.attendance, a) : null;
            return (
              <Row
                key={a.id}
                title={a.title}
                subtitle={
                  a.done ? (
                    `${fmtDayShort(a.date)} · ${a.mode === 'contagem' ? 'Contagem' : 'Chamada'} · ${d.name(a.recordedById)}`
                  ) : (
                    <Txt v="small" muted>
                      {fmtDayShort(a.date)} · <Pending v="small">Chamada em andamento</Pending>
                    </Txt>
                  )
                }
                right={
                  <>
                    <Txt tabular align="right" w={500}>
                      {a.present}
                    </Txt>
                    {avgA != null ? (
                      <Txt v="small" muted tabular align="right">
                        {fmtDelta(a.present - avgA)} vs. média
                      </Txt>
                    ) : null}
                  </>
                }
                accessibilityLabel={`${a.title}, ${fmtDayShort(a.date)}, ${a.present} presentes`}
                onPress={() => router.push(a.mode === 'chamada' ? `/frequencia/chamada/${a.activityId}` : `/frequencia/contagem?atividade=${encodeURIComponent(a.activityId)}`)}
              />
            );
          })}
        </View>
        {d.attendance.length > limit ? <Button label="Mostrar mais" onPress={() => setLimit((l) => l + 20)} /> : null}
      </Section>
    </Page>
  );
}
