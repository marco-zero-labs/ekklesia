import { Redirect, router } from 'expo-router';
import { View } from 'react-native';
import { Row } from '@/components/List';
import { Page } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useQuery, useSession } from '@/data/DataProvider';
import { ProfileKind } from '@/data/types';

const OPTIONS: { profile: ProfileKind; label: string; name: string; hint: string }[] = [
  { profile: 'pastor', label: 'Pastor', name: 'Josué Almeida', hint: 'Vê e edita tudo, inclusive notas pastorais e pedidos de oração.' },
  { profile: 'secretaria', label: 'Secretaria', name: 'Ana Paula Ribeiro', hint: 'Cadastros, visitantes, frequência e agenda. Vê notas pastorais.' },
  { profile: 'lider', label: 'Líder', name: 'Raimunda Souza', hint: 'Os próprios visitantes, a célula e as escalas em que está.' },
];

/** Login simulado: escolha um perfil para ver o que ele pode fazer. */
export default function Entrar() {
  const { session, sessionReady, signIn } = useSession();
  const church = useQuery((r) => r.getChurch());
  if (sessionReady && session) return <Redirect href="/" />;
  return (
    <Page bare title="Entrar como" subtitle={church.data?.name} maxWidth={560}>
      <View>
        {OPTIONS.map((o, i) => (
          <Row
            key={o.profile}
            first={i === 0}
            title={`${o.label} · ${o.name}`}
            subtitle={o.hint}
            right={<Txt muted>→</Txt>}
            accessibilityLabel={`Entrar como ${o.label}, ${o.name}`}
            onPress={async () => {
              await signIn(o.profile);
              router.replace('/');
            }}
          />
        ))}
      </View>
      <Txt v="small" muted>
        Login simulado para demonstração. Dá para trocar de perfil depois, em Configurações. Os dados ficam só neste aparelho.
      </Txt>
    </Page>
  );
}
