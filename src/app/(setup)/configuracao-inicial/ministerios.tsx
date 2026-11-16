import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Checkbox, Field } from '@/components/Field';
import { Page } from '@/components/Page';
import { SetupActions, SetupPage } from '@/components/SetupPage';
import { Txt } from '@/components/Txt';
import { useQuery, useRepo, useViewer } from '@/data/DataProvider';

const SUGGESTED = ['Louvor', 'Recepção', 'Infantil', 'Diaconia', 'Mídia', 'Intercessão', 'Jovens', 'Coral', 'EBD', 'Casais', 'Missões', 'Ação social'];

/** Etapa 3: ministérios que existem hoje. */
export default function Ministerios() {
  const q = useQuery((r) => r.listMinistries());
  if (!q.data) {
    return (
      <Page bare title="Ministérios">
        <DataState error={q.error} reload={q.reload} />
      </Page>
    );
  }
  return <Form existing={q.data.map((m) => m.name)} />;
}

function Form({ existing }: { existing: string[] }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const [options, setOptions] = useState<string[]>([...SUGGESTED, ...existing.filter((n) => !SUGGESTED.includes(n))]);
  const [checked, setChecked] = useState<string[]>(existing);
  const [other, setOther] = useState('');

  const add = () => {
    const n = other.trim();
    if (!n) return;
    if (!options.includes(n)) setOptions((o) => [...o, n]);
    setChecked((c) => (c.includes(n) ? c : [...c, n]));
    setOther('');
  };
  const save = async () => {
    await repo.setMinistries(checked, viewer.userId);
    await repo.updateChurch({ setupStep: 4 }, viewer.userId);
    router.push('/configuracao-inicial/importar');
    toast(`${checked.length} ministérios salvos`);
  };

  return (
    <SetupPage
      step={3}
      title="Ministérios"
      subtitle="Marque os que existem hoje. Líderes e equipes você define depois de importar as pessoas."
      footer={
        <SetupActions>
          <Button kind="text" label="Voltar" onPress={() => router.back()} />
          <Button label="Pular por enquanto" onPress={() => router.push('/configuracao-inicial/importar')} />
          <Button kind="primary" main label="Continuar" onPress={save} />
        </SetupActions>
      }
    >
      <View>
        {options.map((n) => (
          <Checkbox key={n} label={n} checked={checked.includes(n)} onChange={(on) => setChecked((c) => (on ? [...c, n] : c.filter((x) => x !== n)))} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <Field label="Outro ministério" value={other} onChangeText={setOther} onSubmitEditing={add} style={{ flex: 1 }} />
        <Button label="Adicionar" onPress={add} />
      </View>
      <Txt v="small" muted tabular>
        {checked.length} de {options.length} marcados.
      </Txt>
    </SetupPage>
  );
}
