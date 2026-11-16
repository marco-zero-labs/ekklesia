import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { useFeedback } from '@/components/Feedback';
import { Checkbox, Choice, Field } from '@/components/Field';
import { Page, Section } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useQuery, useRepo } from '@/data/DataProvider';
import { activitiesBetween } from '@/domain/activities';
import { addDays, fmtDayShort, fmtTime, toDateTime, todayDay } from '@/lib/dates';
import { firstName, formatPhone, isValidPhone } from '@/lib/format';
import { colors } from '@/theme/tokens';

const HOW = ['Fui convidado', 'Redes sociais', 'Passei na frente', 'Outro'];

/** Ficha de visitante pelo QR code: pública, sem login e sem menu. */
export default function Ficha() {
  const repo = useRepo();
  const { toast } = useFeedback();
  const church = useQuery((r) => r.getChurch());
  const services = useQuery((r) => r.listServices());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [how, setHow] = useState<string | null>(null);
  const [invited, setInvited] = useState('');
  const [prayer, setPrayer] = useState('');
  const [agree, setAgree] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const churchName = church.data?.name ?? 'Igreja';

  const errors = {
    name: !name.trim() ? 'Escreva seu nome.' : null,
    phone: !isValidPhone(phone) ? 'Escreva o telefone com DDD. Ex.: (81) 99812-4407' : null,
    agree: !agree ? 'Para enviar, marque que concorda com o uso dos dados.' : null,
  };

  const submit = async () => {
    setTried(true);
    if (errors.name || errors.phone || errors.agree) return;
    setSaving(true);
    try {
      await repo.submitFicha({ name, phone, howFound: how ?? 'Não informado', invitedBy: invited, prayerRequest: prayer });
      setSent(name);
    } catch (e) {
      toast(`Não foi possível enviar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    const today = todayDay();
    const now = toDateTime(new Date());
    const upcoming = activitiesBetween(services.data ?? [], [], today, addDays(today, 7)).filter((a) => `${a.date}T${a.time}` > now);
    const celula = upcoming.find((a) => a.serviceId?.startsWith('s-celula'));
    const oracao = upcoming.find((a) => a.serviceId === 's-oracao');
    const domingo = upcoming.filter((a) => a.serviceId === 's-manha' || a.serviceId === 's-noite');
    const ebd = upcoming.find((a) => a.serviceId === 's-ebd');
    const lines = [
      celula && { when: `${fmtDayShort(celula.date)} · ${fmtTime(celula.time)}`, what: celula.title, where: celula.location },
      oracao && { when: `${fmtDayShort(oracao.date)} · ${fmtTime(oracao.time)}`, what: oracao.title, where: oracao.location },
      domingo.length && { when: `${fmtDayShort(domingo[0].date)} · ${domingo.map((a) => fmtTime(a.time)).join(' e ')}`, what: 'Cultos de domingo', where: `Templo${ebd ? ` · EBD às ${fmtTime(ebd.time)}` : ''}` },
    ].filter(Boolean) as { when: string; what: string; where: string }[];
    return (
      <Page bare maxWidth={480} title={`Obrigado, ${firstName(sent)}.`} subtitle={churchName}>
        <Txt>Foi muito bom ter você com a gente. Alguém da recepção vai falar com você pelo WhatsApp nesta semana.</Txt>
        <Txt muted>Se preferir não receber mensagens, é só responder “parar”.</Txt>
        <Section title="Se quiser voltar">
          {lines.map((l) => (
            <View key={l.what} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line2, gap: 2 }}>
              <Txt v="label" color={colors.inkHead} tabular>
                {l.when}
              </Txt>
              <Txt w={500}>{l.what}</Txt>
              <Txt v="small" muted>
                {l.where}
              </Txt>
            </View>
          ))}
          {church.data ? (
            <Txt v="small" muted>
              {church.data.street} {church.data.number}, {church.data.district}, {church.data.city}
            </Txt>
          ) : null}
        </Section>
        <TextLink
          label="Preencher outra ficha"
          onPress={() => {
            setSent(null);
            setName('');
            setPhone('');
            setHow(null);
            setInvited('');
            setPrayer('');
            setAgree(false);
            setTried(false);
          }}
        />
      </Page>
    );
  }

  return (
    <Page bare maxWidth={480} title="Que bom ter você aqui" subtitle={churchName}>
      <Txt muted>Preencha para que alguém da igreja possa falar com você. Leva menos de um minuto.</Txt>
      <Field label="Seu nome" value={name} onChangeText={setName} error={tried ? errors.name : null} autoCapitalize="words" autoComplete="name" />
      <Field label="Telefone com WhatsApp" value={phone} onChangeText={setPhone} mask={formatPhone} keyboardType="phone-pad" autoComplete="tel" tabular error={tried ? errors.phone : null} />
      <Choice<string> label="Como conheceu a igreja" value={how} onChange={setHow} options={HOW.map((h) => ({ value: h, label: h }))} />
      <Field label="Quem convidou" optional value={invited} onChangeText={setInvited} autoCapitalize="words" />
      <Field label="Pedido de oração" optional value={prayer} onChangeText={setPrayer} multiline help="Dado sensível: visível só para o pastor." />
      <Section title="Como vamos usar seus dados">
        <Txt>
          A {churchName} usa seu nome e telefone só para falar com você sobre esta visita e sobre as próximas atividades. Não compartilhamos com ninguém de fora da igreja.
        </Txt>
        <Txt muted>
          Você pode pedir para ver, corrigir ou apagar seus dados a qualquer momento, com a secretaria. Pedido de oração é um dado sensível: fica restrito ao pastor.
        </Txt>
        <Checkbox label="Concordo com o uso dos meus dados para essa finalidade." checked={agree} onChange={setAgree} error={tried ? errors.agree : null} />
        <TextLink small label="Ler o termo completo" onPress={() => router.push('/termo')} />
      </Section>
      <Button kind="primary" main block label="Enviar ficha" loading={saving} onPress={submit} />
    </Page>
  );
}
