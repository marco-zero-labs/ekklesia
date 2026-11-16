import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Notice } from '@/components/List';
import { goBack, Page, Section } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useQuery, useRepo } from '@/data/DataProvider';
import { toDateTime } from '@/lib/dates';
import { firstName } from '@/lib/format';

/**
 * Termo de consentimento (texto de exemplo; a versão final será escrita pelo advogado da igreja).
 * Com ?p=<id> (link enviado pelo WhatsApp), registra a resposta da pessoa com data e hora.
 */
export default function Termo() {
  const { p } = useLocalSearchParams<{ p?: string }>();
  const repo = useRepo();
  const church = useQuery((r) => r.getChurch());
  const person = useQuery((r) => (p ? r.getPerson(p) : Promise.resolve(null)), [p]);
  const [answer, setAnswer] = useState<'dado' | 'recusado' | null>(null);
  const c = church.data;
  const who = person.data ? firstName(person.data.name) : null;

  const respond = async (status: 'dado' | 'recusado') => {
    if (!person.data) return;
    await repo.setConsent(person.data.id, { status, at: toDateTime(new Date()), via: 'link pelo WhatsApp' }, 'publico');
    setAnswer(status);
  };

  const block = (title: string, body: string) => (
    <View style={{ gap: 4 }}>
      <Txt w={600} style={{ fontSize: 14, lineHeight: 20 }}>
        {title}
      </Txt>
      <Txt>{body}</Txt>
    </View>
  );

  if (answer) {
    return (
      <Page bare maxWidth={560} title={answer === 'dado' ? `Obrigado, ${who}.` : `Tudo bem, ${who}.`} subtitle={c?.name}>
        <Txt>
          {answer === 'dado'
            ? 'Sua autorização foi registrada com data e hora. Você pode retirá-la a qualquer momento pela secretaria.'
            : 'Registramos que você não autoriza. Vamos guardar só o necessário para responder a você, e você pode mudar de ideia quando quiser.'}
        </Txt>
      </Page>
    );
  }

  return (
    <Page bare maxWidth={560} title="Autorização para uso dos seus dados" subtitle={c?.name}>
      <Notice tone="pending">
        <Txt v="small" w={500}>
          Texto de exemplo · a revisar
        </Txt>
        <Txt v="small" muted>
          A versão final será escrita pelo advogado da igreja.
        </Txt>
      </Notice>
      {who ? <Txt>Olá, {who}. Leia com calma; leva cerca de 2 minutos.</Txt> : null}
      <Section>
        {block('Quem somos', `${c?.name ?? 'A igreja'}, ${c ? `${c.street} ${c.number}, ${c.district}, ${c.city}` : ''}. Responsável pelos dados: secretaria da igreja.`)}
        {block('Quais dados', 'Nome, telefone, endereço, data de nascimento, família, ministérios em que você serve e presença nos cultos e atividades.')}
        {block('Para quê', 'Organizar a vida da igreja: contato com você, escalas, aniversários e acompanhamento pastoral. Não usamos para propaganda e não vendemos nem repassamos a terceiros.')}
        {block('Dados sensíveis', 'Participação religiosa e pedidos de oração são dados sensíveis. Ficam visíveis só para o pastor e a secretaria.')}
        {block('Por quanto tempo', 'Enquanto você fizer parte da igreja, ou até você pedir a exclusão.')}
        {block('Seus direitos', 'Ver, corrigir, levar ou apagar seus dados a qualquer momento, e retirar esta autorização.')}
        {block('Como pedir', `Pela secretaria, no WhatsApp ${c?.phone ?? ''}, ou pessoalmente.`)}
        <Txt v="small" muted>
          Versão 0.1
        </Txt>
      </Section>
      {person.data ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Não autorizo" onPress={() => respond('recusado')} style={{ flex: 1 }} block />
          <Button kind="primary" label="Autorizo" onPress={() => respond('dado')} style={{ flex: 1 }} block />
        </View>
      ) : (
        <Button label="Voltar" onPress={() => goBack('/ficha')} />
      )}
    </Page>
  );
}
