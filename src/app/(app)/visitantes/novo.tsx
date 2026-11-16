import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Choice, Field } from '@/components/Field';
import { NoAccess } from '@/components/NoAccess';
import { FormActions, goBack, Page, Section } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { AppData, teamIds, useAppData } from '@/data/useAppData';
import { activitiesBetween } from '@/domain/activities';
import { canManageVisitors } from '@/domain/permissions';
import { findByPhone, findMember, serviceDescription, shortActivityLabel } from '@/domain/visitors';
import { addDays, fmtRelativeDay, toDateTime, todayDay } from '@/lib/dates';
import { formatPhone, isValidPhone } from '@/lib/format';
import { colors } from '@/theme/tokens';

const HOW_FOUND = ['Fui convidado', 'Redes sociais', 'Passei na frente', 'Outro'] as const;

export default function NovoVisitante() {
  const viewer = useViewer();
  const q = useAppData();
  if (!canManageVisitors(viewer)) return <NoAccess back="/visitantes" what="cadastrar visitantes" />;
  if (!q.data) {
    return (
      <Page back="/visitantes" title="Novo visitante">
        <DataState error={q.error} reload={q.reload} />
      </Page>
    );
  }
  return <Form d={q.data} />;
}

function Form({ d }: { d: AppData }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const today = todayDay();
  const visits = activitiesBetween(d.services, [], addDays(today, -7), today)
    .filter((a) => d.services.find((s) => s.id === a.serviceId)?.kind === 'culto')
    .reverse()
    .slice(0, 4);
  const me = d.byId.get(viewer.userId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [how, setHow] = useState<string | null>(null);
  const [invited, setInvited] = useState('');
  const [visit, setVisit] = useState<string | null>(visits[0]?.id ?? null);
  const [resp, setResp] = useState<string>(viewer.profile === 'pastor' ? 'nenhum' : viewer.userId);
  const [prayer, setPrayer] = useState('');
  const [consent, setConsent] = useState<'pendente' | 'verbal'>('pendente');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const dup = isValidPhone(phone) ? findByPhone(d.people, phone) : null;
  const member = findMember(d.people, invited);
  const nameError = tried && !name.trim() ? 'Escreva o nome do visitante.' : null;
  const phoneError = (phoneTouched || tried) && phone && !isValidPhone(phone) ? 'Faltam dígitos. Ex.: (81) 99812-4407' : null;

  const save = async () => {
    setTried(true);
    if (!name.trim() || (phone && !isValidPhone(phone))) return;
    const a = visits.find((v) => v.id === visit);
    setSaving(true);
    try {
      const { id, undo } = await repo.createPerson(
        {
          name,
          phone: phone || undefined,
          kind: 'visitante',
          invitedBy: invited.trim() || undefined,
          prayerRequest: prayer.trim() || undefined,
          consent:
            consent === 'verbal'
              ? { status: 'verbal', at: toDateTime(new Date()), via: `verbal, coletado por ${me?.name ?? ''}` }
              : { status: 'pendente', via: 'link pelo WhatsApp' },
          visitor: {
            firstVisit: a?.date ?? today,
            firstVisitService: a ? serviceDescription(a.title) : 'culto',
            responsibleId: resp === 'nenhum' ? null : resp,
            howFound: how ?? undefined,
          },
        },
        viewer.userId,
      );
      router.replace(`/visitantes/${id}`);
      toast('Visitante cadastrado', async () => {
        await undo();
        router.replace('/visitantes');
      });
    } catch (e) {
      setSaving(false);
      toast(`Não foi possível salvar: ${(e as Error).message}`);
    }
  };

  const saveBtn = <Button kind="primary" main label="Salvar visitante" loading={saving} onPress={save} />;

  return (
    <Page back="/visitantes" title="Novo visitante" footer={saveBtn}>
      <Field label="Nome" value={name} onChangeText={setName} error={nameError} autoCapitalize="words" autoComplete="name" />
      <Field
        label="Telefone com WhatsApp"
        value={phone}
        onChangeText={setPhone}
        onBlur={() => setPhoneTouched(true)}
        mask={formatPhone}
        keyboardType="phone-pad"
        tabular
        error={phoneError}
        below={
          dup ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 }}>
              <Txt v="small" color={colors.amberText} w={500}>
                Este telefone já está cadastrado para {dup.name}
              </Txt>
              <TextLink small label="· ver perfil" accessibilityLabel={`Ver perfil de ${dup.name}`} onPress={() => router.push(dup.followUp && dup.followUp.stage !== 'membro' ? `/visitantes/${dup.id}` : `/pessoas/${dup.id}`)} />
            </View>
          ) : null
        }
      />
      <Choice<string> label="Como conheceu" value={how} onChange={setHow} options={HOW_FOUND.map((h) => ({ value: h, label: h }))} />
      <Field label="Quem convidou" optional value={invited} onChangeText={setInvited} autoCapitalize="words" help={member ? 'Membro encontrado' : undefined} />
      {visits.length ? (
        <Choice<string>
          label="Primeira visita"
          value={visit}
          onChange={setVisit}
          options={visits.map((a) => ({ value: a.id, label: shortActivityLabel(a, fmtRelativeDay(a.date, today)) }))}
        />
      ) : null}
      <Choice<string>
        label="Responsável"
        layout="list"
        value={resp}
        onChange={setResp}
        options={[...teamIds(d.people).map((id) => ({ value: id, label: d.name(id) })), { value: 'nenhum', label: 'Sem responsável por enquanto' }]}
      />
      <Field label="Pedido de oração" optional value={prayer} onChangeText={setPrayer} multiline help="Dado sensível: visível só para o pastor." />
      <Section title="Consentimento LGPD">
        <Choice<'pendente' | 'verbal'>
          label="Como foi coletado"
          layout="list"
          value={consent}
          onChange={setConsent}
          options={[
            { value: 'pendente', label: 'Pendente (enviar link pelo WhatsApp)', hint: 'Depois de salvar, envie o link na página do visitante; a resposta fica registrada com data e hora.' },
            { value: 'verbal', label: `Verbal, coletado por ${me?.name ?? 'você'}`, hint: 'Precisa de confirmação por escrito depois.' },
          ]}
        />
      </Section>
      <FormActions>
        {saveBtn}
        <Button kind="text" label="Cancelar" onPress={() => goBack('/visitantes')} />
      </FormActions>
    </Page>
  );
}
