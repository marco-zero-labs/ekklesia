import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Choice, Field } from '@/components/Field';
import { NoAccess } from '@/components/NoAccess';
import { FormActions, goBack, Page } from '@/components/Page';
import { useRepo, useViewer } from '@/data/DataProvider';
import { AttendanceMode } from '@/data/types';
import { useAppData } from '@/data/useAppData';
import { canEditAgenda } from '@/domain/permissions';
import { fmtBrDate, fmtDayShort, parseBrDate, todayDay } from '@/lib/dates';
import { formatDateInput, formatTimeInput, parseTimeInput } from '@/lib/format';

export default function NovaAtividade() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const q = useAppData();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(fmtBrDate(data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : todayDay()));
  const [time, setTime] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('Templo');
  const [ministry, setMinistry] = useState('nenhum');
  const [mode, setMode] = useState<AttendanceMode>('contagem');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!canEditAgenda(viewer)) return <NoAccess back="/agenda" what="criar atividades na agenda" />;
  if (!q.data) {
    return (
      <Page back="/agenda" title="Nova atividade">
        <DataState error={q.error} reload={q.reload} />
      </Page>
    );
  }
  const day = parseBrDate(date);
  const start = parseTimeInput(time);
  const finish = end ? parseTimeInput(end) : null;
  const errors = {
    title: !title.trim() ? 'Dê um nome à atividade.' : null,
    date: !day ? 'Data inválida. Ex.: 21/11/2026' : null,
    time: !start ? 'Horário inválido. Ex.: 19h30' : null,
    end: end && (!finish || (start && finish <= start)) ? 'O término precisa ser depois do início.' : null,
    location: !location.trim() ? 'Informe o local.' : null,
  };

  const save = async () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const { id, undo } = await repo.createEvent(
      { title: title.trim(), date: day!, time: start!, endTime: finish ?? undefined, location: location.trim(), ministryId: ministry === 'nenhum' ? undefined : ministry, mode, note: note.trim() || undefined },
      viewer.userId,
    );
    router.replace(`/agenda/${id}`);
    toast('Atividade criada', async () => {
      await undo();
      router.replace('/agenda');
    });
  };
  const saveBtn = <Button kind="primary" main label="Salvar atividade" loading={saving} onPress={save} />;

  return (
    <Page back="/agenda" title="Nova atividade" footer={saveBtn}>
      <Field label="Nome" value={title} onChangeText={setTitle} placeholder="Ex.: Reunião de líderes" error={tried ? errors.title : null} />
      <Field label="Data" value={date} onChangeText={setDate} mask={formatDateInput} keyboardType="number-pad" tabular placeholder="dd/mm/aaaa" error={tried || date.length === 10 ? errors.date : null} help={day ? fmtDayShort(day) : undefined} />
      <Field label="Horário" value={time} onChangeText={setTime} mask={formatTimeInput} keyboardType="number-pad" tabular placeholder="19h30" error={tried ? errors.time : null} />
      <Field label="Término" optional value={end} onChangeText={setEnd} mask={formatTimeInput} keyboardType="number-pad" tabular placeholder="21h00" error={tried ? errors.end : null} />
      <Field label="Local" value={location} onChangeText={setLocation} error={tried ? errors.location : null} />
      <Choice<string> label="Ministério" value={ministry} onChange={setMinistry} options={[{ value: 'nenhum', label: 'Nenhum' }, ...q.data.ministries.map((m) => ({ value: m.id, label: m.name }))]} />
      <Choice<AttendanceMode>
        label="Frequência"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'contagem', label: 'Contagem' },
          { value: 'chamada', label: 'Chamada nominal' },
        ]}
      />
      <Field label="Observação" optional value={note} onChangeText={setNote} multiline />
      <FormActions>
        {saveBtn}
        <Button kind="text" label="Cancelar" onPress={() => goBack('/agenda')} />
      </FormActions>
    </Page>
  );
}
