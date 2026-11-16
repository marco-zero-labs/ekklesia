import { router } from 'expo-router';
import { View } from 'react-native';
import { Choice } from '@/components/Field';
import { useFeedback } from '@/components/Feedback';
import { Page, Section } from '@/components/Page';
import { Button } from '@/components/Button';
import { useSession } from '@/data/DataProvider';
import { ProfileKind, USERS } from '@/data/types';

export default function Configuracoes() {
  const { session, signIn, signOut } = useSession();
  const { toast } = useFeedback();
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
            { value: 'pastor', label: 'Pastor · Josué Almeida' },
            { value: 'secretaria', label: 'Secretaria · Ana Paula Ribeiro' },
            { value: 'lider', label: 'Líder · Raimunda Souza' },
          ]}
        />
        <View>
          <Button
            label="Sair"
            onPress={async () => {
              await signOut();
              router.replace('/entrar');
            }}
          />
        </View>
      </Section>
    </Page>
  );
}
