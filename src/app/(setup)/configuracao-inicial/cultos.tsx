import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Choice, Field } from '@/components/Field';
import { Page } from '@/components/Page';
import { SetupActions, SetupPage } from '@/components/SetupPage';
import { Txt } from '@/components/Txt';
import { useQuery, useRepo, useViewer } from '@/data/DataProvider';
import { AttendanceMode, Service } from '@/data/types';
import { fmtTime } from '@/lib/dates';
import { formatTimeInput, parseTimeInput } from '@/lib/format';
import { colors } from '@/theme/tokens';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
type Draft = { id: string; name: string; weekday: number; time: string; mode: AttendanceMode; location: string; keep?: Service };

/** Etapa 2: cultos recorrentes. Cada culto vira atividade na Agenda e na Frequência. */
export default function Cultos() {
  const q = useQuery((r) => r.listServices());
  if (!q.data) {
    return (
      <Page bare title="Cultos recorrentes">
        <DataState error={q.error} reload={q.reload} />
      </Page>
    );
  }
  return <Form services={q.data} />;
}

function Form({ services }: { services: Service[] }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const cultos = services.filter((s) => s.kind === 'culto');
  const initial: Draft[] = cultos.length
    ? cultos.map((s) => ({ id: s.id, name: s.name, weekday: s.weekday, time: fmtTime(s.time), mode: s.mode, location: s.location, keep: s }))
    : [
        { id: 's-manha', name: 'Culto de domingo – manhã', weekday: 0, time: '10h30', mode: 'contagem', location: 'Templo' },
        { id: 's-noite', name: 'Culto de domingo – noite', weekday: 0, time: '18h00', mode: 'contagem', location: 'Templo' },
      ];
  const [list, setList] = useState<Draft[]>(initial);
  const [tried, setTried] = useState(false);
  const update = (i: number, patch: Partial<Draft>) => setList((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const invalid = (x: Draft) => !x.name.trim() || !parseTimeInput(x.time);

  const save = async (go: string) => {
    setTried(true);
    if (list.some(invalid)) return;
    const next: Service[] = [
      ...list.map((x) => ({ ...(x.keep ?? { kind: 'culto' as const }), id: x.id, name: x.name.trim(), weekday: x.weekday, time: parseTimeInput(x.time)!, mode: x.mode, location: x.location.trim() || 'Templo', kind: 'culto' as const })),
      ...services.filter((s) => s.kind !== 'culto'),
    ];
    await repo.saveServices(next, viewer.userId);
    await repo.updateChurch({ setupStep: 3 }, viewer.userId);
    router.push(go as '/configuracao-inicial/ministerios');
    toast('Cultos salvos');
  };

  return (
    <SetupPage
      step={2}
      title="Cultos recorrentes"
      subtitle="Cada culto vira uma atividade na Agenda e na Frequência. Células e ensaios você cria depois."
      footer={
        <SetupActions>
          <Button kind="text" label="Voltar" onPress={() => router.back()} />
          <Button kind="primary" main label="Continuar" onPress={() => save('/configuracao-inicial/ministerios')} />
        </SetupActions>
      }
    >
      {list.map((x, i) => (
        <View key={x.id} style={{ gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
          <Field label="Nome" value={x.name} onChangeText={(name) => update(i, { name })} error={tried && !x.name.trim() ? 'Dê um nome ao culto.' : null} />
          <Choice<string> label="Dia" value={String(x.weekday)} onChange={(v) => update(i, { weekday: Number(v) })} options={DAYS.map((d, k) => ({ value: String(k), label: d }))} />
          <Field label="Horário" value={x.time} onChangeText={(time) => update(i, { time })} mask={formatTimeInput} keyboardType="number-pad" tabular error={tried && !parseTimeInput(x.time) ? 'Horário inválido. Ex.: 19h30' : null} />
          <Choice<AttendanceMode>
            label="Frequência"
            value={x.mode}
            onChange={(mode) => update(i, { mode })}
            options={[
              { value: 'contagem', label: 'Contagem' },
              { value: 'chamada', label: 'Chamada nominal' },
            ]}
          />
          {list.length > 1 ? <TextLink small label="Remover este culto" onPress={() => setList((l) => l.filter((_, k) => k !== i))} /> : null}
        </View>
      ))}
      <Button label="Adicionar culto" onPress={() => setList((l) => [...l, { id: `s-${Date.now().toString(36)}`, name: '', weekday: 3, time: '19h30', mode: 'contagem', location: 'Templo' }])} />
      <Txt v="small" muted>
        Contagem: a recepção registra o total de presentes, visitantes e crianças. Chamada nominal: a lista de quem estava. Dá para trocar em cada atividade.
      </Txt>
    </SetupPage>
  );
}
