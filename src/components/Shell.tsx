import { Href, router, usePathname } from 'expo-router';
import { ReactNode, useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useSession } from '@/data/DataProvider';
import { USERS } from '@/data/types';
import { canSeeArea } from '@/domain/permissions';
import { colors, layout, radius } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';
import { Txt } from './Txt';

type NavItem = { href: Href; label: string; match: (p: string) => boolean };

const MAIN: NavItem[] = [
  { href: '/', label: 'Início', match: (p) => p === '/' },
  { href: '/visitantes', label: 'Visitantes', match: (p) => p.startsWith('/visitantes') },
  { href: '/pessoas', label: 'Pessoas', match: (p) => p.startsWith('/pessoas') || p.startsWith('/busca') },
  { href: '/frequencia', label: 'Frequência', match: (p) => p.startsWith('/frequencia') },
  { href: '/ministerios', label: 'Ministérios', match: (p) => p.startsWith('/ministerios') },
  { href: '/agenda', label: 'Agenda', match: (p) => p.startsWith('/agenda') },
];

const TABS: NavItem[] = [
  { href: '/', label: 'Início', match: (p) => p === '/' },
  { href: '/visitantes', label: 'Visitantes', match: (p) => p.startsWith('/visitantes') },
  { href: '/frequencia', label: 'Frequência', match: (p) => p.startsWith('/frequencia') },
  { href: '/ministerios', label: 'Escalas', match: (p) => p.startsWith('/ministerios') },
  {
    href: '/mais',
    label: 'Mais',
    match: (p) => ['/mais', '/pessoas', '/agenda', '/permissoes', '/configuracoes', '/busca'].some((x) => p.startsWith(x)),
  },
];

/** Área logada: sidebar no desktop (≥ 1024px), barra de abas embaixo no celular. */
export function Shell({ children }: { children: ReactNode }) {
  const { wide } = useLayout();
  useCommandK();
  // a mesma árvore nos dois modos: girar o tablet ou redimensionar a janela não desmonta a tela atual
  // (nem perde o que estava sendo digitado)
  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: colors.surface }}>
      {wide ? <Sidebar /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {wide ? null : <TabBar />}
    </View>
  );
}

/** ⌘K / Ctrl+K abre a busca de pessoas (web). */
function useCommandK() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        router.push('/busca');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function Sidebar() {
  const path = usePathname();
  const { session } = useSession();
  const church = useQuery((r) => r.getChurch());
  const user = useQuery((r) => r.getPerson(session?.userId ?? ''), [session?.userId]);
  const viewer = session ?? { profile: 'pastor' as const, userId: '' };
  const isMac = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <View
      accessibilityRole="none"
      style={{
        width: layout.sidebar,
        backgroundColor: colors.paper,
        borderRightWidth: 1,
        borderRightColor: colors.line,
        paddingTop: 20,
        paddingHorizontal: 12,
        paddingBottom: 16,
        gap: 24,
      }}
    >
      <View style={{ paddingHorizontal: 12, gap: 4 }}>
        <Txt v="title">Ekklesia</Txt>
        <Txt v="small" muted>
          {church.data?.name ?? ' '}
        </Txt>
      </View>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Buscar pessoa por nome ou telefone"
        onPress={() => router.push('/busca')}
        style={(s) => ({
          height: 32,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.field,
          backgroundColor: (s as { hovered?: boolean }).hovered ? colors.hover : colors.surface,
        })}
      >
        <Txt muted style={{ fontSize: 14 }}>
          Buscar pessoa
        </Txt>
        <Txt v="small" muted>
          {isMac ? '⌘K' : 'Ctrl+K'}
        </Txt>
      </Pressable>
      <View accessibilityRole="menu" accessibilityLabel="Principal" style={{ gap: 2 }}>
        {MAIN.map((item) => (
          <NavLink key={item.label} item={item} active={item.match(path)} />
        ))}
      </View>
      <View style={{ marginTop: 'auto', gap: 2, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
        {canSeeArea(viewer, 'permissoes') ? <NavLink item={{ href: '/permissoes', label: 'Permissões', match: (p) => p.startsWith('/permissoes') }} active={path.startsWith('/permissoes')} /> : null}
        <NavLink item={{ href: '/configuracoes', label: 'Configurações', match: () => false }} active={path.startsWith('/configuracoes')} />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${user.data?.name ?? ''}, ${session ? USERS[session.profile].label : ''}. Trocar de perfil em Configurações`}
          onPress={() => router.push('/configuracoes')}
          style={(s) => ({
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 12,
            borderRadius: radius.md,
            backgroundColor: (s as { hovered?: boolean }).hovered ? colors.navActive : 'transparent',
          })}
        >
          <Txt w={500} style={{ fontSize: 14, lineHeight: 20 }}>
            {user.data?.name ?? ' '}
          </Txt>
          <Txt v="small" muted>
            {session ? USERS[session.profile].label : ''}
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      aria-current={active ? 'page' : undefined}
      onPress={() => router.navigate(item.href)}
      style={(s) => ({
        height: 32,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: radius.md,
        backgroundColor: active || (s as { hovered?: boolean }).hovered ? colors.navActive : 'transparent',
      })}
    >
      <Txt w={active ? 500 : 400} color={active ? colors.petrol600 : colors.inkHead} style={{ fontSize: 14, lineHeight: 20 }}>
        {item.label}
      </Txt>
    </Pressable>
  );
}

function TabBar() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.line,
        backgroundColor: colors.surface,
        paddingBottom: insets.bottom,
      }}
    >
      {TABS.map((t) => {
        const on = t.match(path);
        return (
          <Pressable
            key={t.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
            onPress={() => router.navigate(t.href)}
            style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <View style={{ width: 24, height: 2, borderRadius: 1, backgroundColor: on ? colors.petrol600 : 'transparent' }} />
            <Txt v="label" color={on ? colors.petrol600 : colors.ink2} style={{ fontSize: 12 }}>
              {t.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
