import { Href, router } from 'expo-router';
import { View } from 'react-native';
import { Row } from '@/components/List';
import { Page } from '@/components/Page';
import { useQuery, useViewer } from '@/data/DataProvider';
import { USERS } from '@/data/types';
import { canSeeArea } from '@/domain/permissions';

/** Aba "Mais" no celular: o que não cabe na barra de abas. */
export default function Mais() {
  const viewer = useViewer();
  const me = useQuery((r) => r.getPerson(viewer.userId), [viewer.userId]);
  const items: { href: Href; title: string; subtitle: string; show: boolean }[] = [
    { href: '/pessoas', title: 'Pessoas', subtitle: 'Membros, famílias e cadastros', show: true },
    { href: '/agenda', title: 'Agenda', subtitle: 'Cultos, células e atividades da semana', show: true },
    { href: '/permissoes', title: 'Permissões', subtitle: 'Perfis e trilha de auditoria', show: canSeeArea(viewer, 'permissoes') },
    { href: '/configuracoes', title: 'Configurações', subtitle: `${me.data?.name ?? ''} · ${USERS[viewer.profile].label} · trocar de perfil`, show: true },
  ];
  return (
    <Page title="Mais">
      <View>
        {items
          .filter((i) => i.show)
          .map((i, k) => (
            <Row key={i.title} first={k === 0} title={i.title} subtitle={i.subtitle} onPress={() => router.push(i.href)} />
          ))}
      </View>
    </Page>
  );
}
