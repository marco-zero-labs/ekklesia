import { router } from 'expo-router';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Button, TextLink } from '@/components/Button';
import { Checkbox, Choice } from '@/components/Field';
import { useFeedback } from '@/components/Feedback';
import { Detail, Page, Section } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useQuery, useRepo, useSession, useViewer } from '@/data/DataProvider';
import { DemoSettings } from '@/data/repository';
import { ProfileKind, USERS } from '@/data/types';
import { canEditArea } from '@/domain/permissions';
import { saveTextFile } from '@/lib/download';
import { publicUrl } from '@/lib/links';
import { colors } from '@/theme/tokens';

export default function Configuracoes() {
  const { session, signIn, signOut } = useSession();
  const viewer = useViewer();
  const repo = useRepo();
  const { toast, confirm } = useFeedback();
  const church = useQuery((r) => r.getChurch());
  const [demo, setDemo] = useState<DemoSettings>(repo.getDemo());
  const fichaUrl = publicUrl('/ficha');
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toString(fichaUrl, { type: 'svg', margin: 1, color: { dark: colors.ink, light: '#FFFFFF' }, errorCorrectionLevel: 'M' }).then(setQr);
  }, [fichaUrl]);
  const admin = canEditArea(viewer, 'pessoas');

  const changeDemo = async (d: DemoSettings) => {
    setDemo(d);
    await repo.setDemo(d);
  };

  return (
    <Page back="/" title="Configurações">
      <Section title="Perfil">
        <Choice<ProfileKind>
          label="Entrar como"
          layout="list"
          value={session?.profile ?? null}
          onChange={async (p) => {
            await signIn(p);
            toast(`Agora você está como ${USERS[p].label}`);
          }}
          options={[
            { value: 'pastor', label: 'Pastor · Josué Almeida', hint: 'Vê e edita tudo.' },
            { value: 'secretaria', label: 'Secretaria · Ana Paula Ribeiro', hint: 'Vê notas pastorais, não edita.' },
            { value: 'lider', label: 'Líder · Raimunda Souza', hint: 'Só os próprios visitantes, ministérios e célula.' },
          ]}
        />
        <Button
          label="Sair"
          onPress={async () => {
            await signOut();
            router.replace('/entrar');
          }}
        />
      </Section>

      <Section title="Ficha de visitante (QR code)">
        <Txt muted>Imprima e deixe na recepção. Quem lê o código abre a ficha no celular, sem login, e entra na fila de Visitantes como Primeira visita.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <View style={{ width: 168, height: 168, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 8, backgroundColor: '#fff' }} accessible accessibilityRole="image" accessibilityLabel={`QR code da ficha de visitante: ${fichaUrl}`}>
            {qr ? <SvgXml xml={qr} width="100%" height="100%" /> : null}
          </View>
          <View style={{ gap: 8, flex: 1, minWidth: 200 }}>
            <Txt v="small" muted selectable>
              {fichaUrl}
            </Txt>
            <Button
              label="Baixar QR code"
              disabled={!qr}
              onPress={async () => {
                if (!qr) return;
                await saveTextFile('ficha-de-visitante-qrcode.svg', qr, 'image/svg+xml');
                toast('QR code baixado');
              }}
            />
            <TextLink small label="Abrir a ficha" onPress={() => router.push('/ficha')} />
          </View>
        </View>
      </Section>

      <Section title="Igreja">
        {church.data ? (
          <View>
            <Detail label="Nome">{church.data.name}</Detail>
            <Detail label="Endereço">{`${church.data.street} ${church.data.number}, ${church.data.district}, ${church.data.city}`}</Detail>
            <Detail label="Secretaria">{church.data.phone}</Detail>
          </View>
        ) : null}
        {admin ? <TextLink label="Refazer configuração inicial" onPress={() => router.push('/configuracao-inicial')} /> : null}
      </Section>

      <Section title="Dados de exemplo">
        <Txt muted>Os dados ficam só neste aparelho. Enquanto ninguém alterar nada, as datas de exemplo acompanham o dia de hoje.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Button
            label="Restaurar dados de exemplo"
            onPress={async () => {
              const ok = await confirm({ title: 'Restaurar dados de exemplo?', body: 'Tudo o que foi registrado neste aparelho será substituído pelos dados de exemplo da Igreja Batista do Bairro Novo, com datas a partir de hoje.', confirm: 'Restaurar' });
              if (!ok) return;
              await repo.resetSample();
              toast('Dados de exemplo restaurados');
              router.replace('/');
            }}
          />
          <Button
            label="Começar com a igreja vazia"
            onPress={async () => {
              const ok = await confirm({ title: 'Começar com a igreja vazia?', body: 'Apaga pessoas, ministérios, agenda e frequência deste aparelho e abre a configuração inicial. Dá para restaurar os dados de exemplo depois.', confirm: 'Apagar e começar' });
              if (!ok) return;
              await repo.startEmpty();
              router.replace('/configuracao-inicial');
            }}
          />
        </View>
      </Section>

      <Section title="Demonstração dos estados">
        <Txt muted>Para ver como as telas se comportam com conexão lenta ou com falha.</Txt>
        <Checkbox label="Simular conexão lenta" hint="As listas mostram o carregamento por 1,5 segundo." checked={demo.slow} onChange={(slow) => changeDemo({ ...demo, slow })} />
        <Checkbox label="Simular erro de conexão" hint="As telas mostram o erro com “Tentar de novo”." checked={demo.fail} onChange={(fail) => changeDemo({ ...demo, fail })} />
      </Section>
    </Page>
  );
}
