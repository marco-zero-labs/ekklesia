import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { useFeedback, SkeletonList, ErrorBlock } from '@/components/Feedback';
import { Checkbox, Choice, Field } from '@/components/Field';
import { EmptyLine, Row, Tabs } from '@/components/List';
import { Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { formatPhone } from '@/lib/format';
import { colors } from '@/theme/tokens';

/** Sistema de design vivo: os componentes base do app, com os tokens do design-system.html. */
export default function DesignSystem() {
  const { toast, confirm } = useFeedback();
  const [phone, setPhone] = useState('81998124407');
  const [tipo, setTipo] = useState<'ligacao' | 'whatsapp'>('ligacao');
  const [tab, setTab] = useState<'todos' | 'primeira'>('todos');
  const [ok, setOk] = useState(false);
  const swatches: [string, string][] = [
    ['ink', colors.ink],
    ['ink-2', colors.ink2],
    ['paper', colors.paper],
    ['line', colors.line],
    ['field', colors.field],
    ['petrol-600', colors.petrol600],
    ['amber-text', colors.amberText],
    ['error', colors.error],
  ];
  return (
    <Page back="/" title="Sistema de design" subtitle="Ekklesia · v0.1">
      <Section title="Cores">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {swatches.map(([n, c]) => (
            <View key={n} style={{ gap: 4, width: 96 }}>
              <View style={{ height: 40, borderRadius: 6, backgroundColor: c, borderWidth: 1, borderColor: colors.line }} />
              <Txt v="label">{n}</Txt>
              <Txt v="small" muted tabular>
                {c}
              </Txt>
            </View>
          ))}
        </View>
      </Section>
      <Section title="Tipografia">
        <Txt v="title">Acompanhamento</Txt>
        <Txt v="number" tabular>
          287
        </Txt>
        <Txt>Maria das Graças Nascimento Silva · (81) 3427-1180</Txt>
        <Txt v="label" color={colors.inkHead}>
          Próximo contato
        </Txt>
        <Pending>Vencido há 4 dias</Pending>
      </Section>
      <Section title="Botões">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Button kind="primary" label="Registrar contato" onPress={() => toast('Contato registrado', () => toast('Desfeito'))} />
          <Button label="Atribuir" onPress={() => {}} />
          <Button kind="text" label="Limpar" onPress={() => {}} />
          <Button kind="primary" label="Salvando…" loading />
          <Button label="Desabilitado" disabled />
          <Button
            label="Remover da escala"
            onPress={async () => {
              const yes = await confirm({ title: 'Remover da escala?', body: 'Bruno Arruda deixa de estar escalado para Baixo.', confirm: 'Remover' });
              if (yes) toast('Removido da escala');
            }}
          />
        </View>
        <TextLink label="Ver todos os visitantes →" onPress={() => {}} />
      </Section>
      <Section title="Inputs">
        <Field label="Telefone com WhatsApp" value={phone} onChangeText={setPhone} mask={formatPhone} keyboardType="phone-pad" tabular />
        <Field label="Telefone" value="(81) 9981" onChangeText={() => {}} error="Faltam dígitos. Ex.: (81) 99812-4407" />
        <Choice
          label="Tipo"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: 'ligacao', label: 'Ligação' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ]}
        />
        <Checkbox label="Concordo com o uso dos meus dados para essa finalidade." checked={ok} onChange={setOk} />
      </Section>
      <Section title="Lista">
        <Tabs
          label="Etapas"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'todos', label: 'Todos', count: 24 },
            { value: 'primeira', label: 'Primeira visita', count: 8 },
          ]}
        />
        <View>
          <Row title="Maria das Graças Nascimento Silva" subtitle={<Pending v="small">Vencido há 4 dias</Pending>} right="Thiago Batista" onPress={() => {}} />
          <Row title="Lucas Ferreira" subtitle="Hoje" onPress={() => {}} />
        </View>
        <EmptyLine>
          <Txt>Nenhum membro com “Raimunda” em Mídia.</Txt>
        </EmptyLine>
      </Section>
      <Section title="Estados">
        <SkeletonList rows={2} />
        <ErrorBlock title="Não foi possível carregar a lista de pessoas" body="Nenhum dado foi perdido." onRetry={() => {}} />
      </Section>
    </Page>
  );
}
