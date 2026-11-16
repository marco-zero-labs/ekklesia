import { Href, router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, View, StyleProp, ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';
import { Txt } from './Txt';

export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

type PageProps = {
  /** Mostra "← Voltar" (volta no histórico; sem histórico, vai para este endereço). */
  back?: Href;
  title?: string;
  subtitle?: ReactNode;
  /** No máximo uma ação principal. */
  action?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  /** Rodapé fixo no celular (ex.: botão principal de formulário). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Página pública: sem menu, centralizada no celular. */
  bare?: boolean;
  onRefresh?: () => void;
};

/**
 * Página interna: "← Voltar" no topo, um título e no máximo uma ação principal.
 * Conteúdo com largura máxima (720px; Início 640px), alinhado à esquerda, junto à sidebar.
 */
export function Page({ back, title, subtitle, action, children, maxWidth = layout.content, footer, scroll = true, bare, onRefresh }: PageProps) {
  const { pad, wide, mobile } = useLayout();
  const insets = useSafeAreaInsets();
  const top = bare ? Math.max(insets.top, 0) + (wide ? 48 : 24) : wide ? 32 : Math.max(insets.top, 0) + 12;
  const content = (
    <View
      style={{
        width: '100%',
        maxWidth,
        alignSelf: bare && wide ? 'center' : 'flex-start',
        paddingHorizontal: pad,
        paddingTop: top,
        paddingBottom: footer && mobile ? 24 : 64,
        gap: 24,
      }}
    >
      {back || title ? (
        <View style={{ gap: 8 }}>
          {back ? <BackLink fallback={back} /> : null}
          {title ? (
            <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'flex-start' : 'stretch', gap: 12 }}>
              <View style={{ flex: wide ? 1 : undefined, gap: 4 }}>
                <Txt v="title" accessibilityRole="header" aria-level={1}>
                  {title}
                </Txt>
                {typeof subtitle === 'string' ? <Txt muted>{subtitle}</Txt> : subtitle}
              </View>
              {action && wide ? action : null}
            </View>
          ) : null}
        </View>
      ) : null}
      {children}
      {action && !wide && !footer ? <View style={{ paddingTop: 8 }}>{action}</View> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh && mobile ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {footer && mobile ? (
        <View
          style={{
            paddingHorizontal: pad,
            paddingTop: 12,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            backgroundColor: colors.surface,
            gap: 8,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/** No desktop, o rodapé do formulário aparece dentro da página. */
export function FormActions({ children }: { children: ReactNode }) {
  const { mobile } = useLayout();
  if (mobile) return null;
  return <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingTop: 8 }}>{children}</View>;
}

export function BackLink({ fallback, label = 'Voltar' }: { fallback: Href; label?: string }) {
  const { mobile } = useLayout();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => goBack(fallback)}
      hitSlop={8}
      style={{ alignSelf: 'flex-start', minHeight: mobile ? 44 : 24, justifyContent: 'center' }}
    >
      {(s) => (
        <Txt w={500} color={(s as { hovered?: boolean }).hovered ? colors.ink : colors.petrol600}>
          ← {label}
        </Txt>
      )}
    </Pressable>
  );
}

/** Grupo de conteúdo com título discreto (14/600 e divisória), como no design. */
export function Section({ title, right, children, style }: { title?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 8 }, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 }}>
          <Txt w={600} style={{ fontSize: 14, lineHeight: 20 }} accessibilityRole="header" aria-level={2}>
            {title}
          </Txt>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Par rótulo/valor numa página de item. */
export function Detail({ label, children, right }: { label: string; children: ReactNode; right?: ReactNode }) {
  const { wide } = useLayout();
  return (
    <View
      style={{
        flexDirection: wide ? 'row' : 'column',
        gap: wide ? 16 : 2,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.line2,
      }}
    >
      <Txt v="label" color={colors.inkHead} style={{ width: wide ? 180 : undefined, paddingTop: wide ? 2 : 0 }}>
        {label}
      </Txt>
      <View style={{ flex: wide ? 1 : undefined, gap: 2 }}>
        {typeof children === 'string' ? <Txt>{children}</Txt> : children}
      </View>
      {right}
    </View>
  );
}
