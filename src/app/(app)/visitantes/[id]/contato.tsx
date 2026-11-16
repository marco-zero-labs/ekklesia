import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Choice, Field } from '@/components/Field';
import { Notice } from '@/components/List';
import { NoAccess, NotFound } from '@/components/NoAccess';
import { FormActions, goBack, Page } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { CONTACT_RESULTS, CONTACT_TYPES, ContactResult, ContactType, Person, stageLabel } from '@/data/types';
import { AppData, useAppData } from '@/data/useAppData';
import { attempts, defaultTemplate, suggestNextContact, TemplateKind, unansweredStreak, visitSuggestion, whatsappMessage } from '@/domain/followup';
import { canRegisterContact } from '@/domain/permissions';
import { fmtBrDate, fmtDayShort, fmtTime, nextWeekday, parseBrDate, todayDay, weekdayName } from '@/lib/dates';
import { formatDateInput, isMobilePhone, plural, whatsappLink } from '@/lib/format';
import { colors } from '@/theme/tokens';

type Kind = Exclude<ContactType, 'recepcao'>;

export default function RegistrarContato() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewer = useViewer();
  const q = useAppData();
  if (!q.data) {
    return (
      <Page back={`/visitantes/${id}`} title="Registrar contato">
        <DataState error={q.error} reload={q.reload} what="o visitante" />
      </Page>
    );
  }
  const p = q.data.byId.get(id);
  if (!p || !p.followUp) return <NotFound back="/visitantes" what="Visitante" />;
  if (!canRegisterContact(viewer, p)) return <NoAccess back={`/visitantes/${id}`} what="registrar contato deste visitante" />;
  return <Form p={p} d={q.data} />;
}

function Form({ p, d }: { p: Person; d: AppData }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const fu = p.followUp!;
  const today = todayDay();
  const streak = unansweredStreak(fu.contacts);
  const [type, setType] = useState<Kind | null>(p.phone ? 'ligacao' : 'visita');
  const [result, setResult] = useState<ContactResult | null>(null);
  const [note, setNote] = useState('');
  const [next, setNext] = useState('');
  const [nextEdited, setNextEdited] = useState(false);
  const [template, setTemplate] = useState<TemplateKind>(defaultTemplate(fu.contacts));
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const me = d.byId.get(viewer.userId);
  const oracao = d.services.find((s) => s.id === 's-oracao');
  const nextService = oracao ? `${nextWeekday(today, oracao.weekday) === today ? 'Hoje' : `Na ${weekdayName(oracao.weekday).toLowerCase()}`} tem ${oracao.name.toLowerCase()} às ${fmtTime(oracao.time)}` : undefined;
  const autoMessage = useMemo(
    () => whatsappMessage(template, { visitorName: p.name, senderName: me?.name ?? '', churchName: d.church.name, senderIsReception: viewer.profile === 'secretaria', nextService }),
    [template, p.name, me?.name, d.church.name, viewer.profile, nextService],
  );
  const [message, setMessage] = useState<string | null>(null);
  const msg = message ?? autoMessage;

  const suggestion = result ? suggestNextContact(result, today) : null;
  const nextValue = nextEdited ? next : suggestion ? fmtBrDate(suggestion.day) : '';
  const nextDay = nextValue ? parseBrDate(nextValue) : null;
  const nextError = nextEdited && nextValue && !nextDay ? 'Data inválida. Ex.: 18/11/2026' : nextDay && nextDay < today ? 'O próximo contato não pode ser no passado.' : null;
  const visitN = visitSuggestion(fu.contacts, type, result);

  const save = async () => {
    setTried(true);
    if (!type || !result || nextError) return;
    setSaving(true);
    try {
      const { stageChanged, undo } = await repo.registerContact(p.id, { type, result, note, nextContact: nextDay }, viewer.userId);
      goBack(`/visitantes/${p.id}`);
      toast(stageChanged ? `Contato registrado · etapa: ${stageLabel(stageChanged)}` : 'Contato registrado', undo);
    } catch (e) {
      setSaving(false);
      toast(`Não foi possível salvar: ${(e as Error).message}`);
    }
  };

  const tentativas = attempts(fu.contacts).length;
  const status = streak > 0 ? `${plural(streak, 'tentativa', 'tentativas')} sem resposta` : tentativas === 0 ? 'nenhuma tentativa ainda' : plural(tentativas, 'tentativa', 'tentativas');
  const saveBtn = <Button kind="primary" main label="Salvar contato" loading={saving} disabled={tried && (!type || !result)} onPress={save} />;

  return (
    <Page
      back={`/visitantes/${p.id}`}
      title="Registrar contato"
      subtitle={`${p.name} · ${stageLabel(fu.stage)} · ${status}`}
      footer={saveBtn}
    >
      <Choice<Kind> label="Tipo" value={type} onChange={setType} options={CONTACT_TYPES} />

      {type === 'whatsapp' ? (
        <View style={{ gap: 8 }}>
          {!p.phone ? (
            <Pending v="small">Sem telefone cadastrado. Registre o contato e peça o número na próxima visita.</Pending>
          ) : !isMobilePhone(p.phone) ? (
            <Txt v="small" muted>
              {p.phone} é fixo: o WhatsApp pode não funcionar neste número.
            </Txt>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12 }}>
            <Txt v="small" muted>
              Modelo: {template === 'primeira' ? 'primeira visita' : 'depois de tentativas sem resposta'}
            </Txt>
            <TextLink
              small
              label="Trocar modelo"
              onPress={() => {
                setTemplate((t) => (t === 'primeira' ? 'tentativas' : 'primeira'));
                setMessage(null);
              }}
            />
          </View>
          <Field label="Mensagem" value={msg} onChangeText={setMessage} multiline />
          {p.phone ? <Button label="Abrir no WhatsApp" onPress={() => Linking.openURL(whatsappLink(p.phone!, msg))} /> : null}
        </View>
      ) : null}

      <Choice<ContactResult> label="Resultado" value={result} onChange={setResult} options={CONTACT_RESULTS} />
      {tried && !result ? (
        <Txt v="small" color={colors.error}>
          Escolha o resultado do contato.
        </Txt>
      ) : null}

      <Field label="Observação" optional value={note} onChangeText={setNote} multiline placeholder="Ex.: Caixa postal. Tentar depois das 19h." />

      <Field
        label="Próximo contato"
        value={nextValue}
        onChangeText={(s) => {
          setNextEdited(true);
          setNext(s);
        }}
        mask={formatDateInput}
        keyboardType="number-pad"
        tabular
        placeholder="dd/mm/aaaa"
        error={nextError}
        help={
          nextDay
            ? `${fmtDayShort(nextDay)}${suggestion && !nextEdited ? ` · sugerido: ${suggestion.days} dias depois, ${suggestion.reason}` : ''}`
            : 'Escolha o resultado para ver a data sugerida.'
        }
        below={
          nextEdited && suggestion ? (
            <TextLink
              small
              label={`Usar a sugestão (${fmtDayShort(suggestion.day)})`}
              onPress={() => {
                setNextEdited(false);
                setNext('');
              }}
            />
          ) : null
        }
      />

      {visitN ? (
        <Notice tone="pending">
          <Txt>Esta seria a {visitN}ª tentativa sem resposta. Que tal uma visita?</Txt>
          <Button label="Registrar como visita" onPress={() => setType('visita')} />
        </Notice>
      ) : null}

      <FormActions>
        {saveBtn}
        <Button kind="text" label="Cancelar" onPress={() => goBack(`/visitantes/${p.id}`)} />
      </FormActions>
    </Page>
  );
}
