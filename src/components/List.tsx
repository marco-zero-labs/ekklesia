import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';
import { Txt } from './Txt';

type RowProps = {
  /** Nome (14/500; 16/500 no celular). */
  title: string;
  /** Linha de baixo, em cinza (ou âmbar via `subtitleAmber`). */
  subtitle?: ReactNode;
  /** Valor à direita (números, datas). */
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  first?: boolean;
};

/** Linha de lista: a linha inteira é clicável e abre a página do item. Divisória de 1px, sem zebra. */
export function Row({ title, subtitle, right, onPress, accessibilityLabel, first }: RowProps) {
  const { mobile } = useLayout();
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt w={500}>{title}</Txt>
        {typeof subtitle === 'string' ? <Txt v="small" muted>{subtitle}</Txt> : subtitle}
      </View>
      {right != null ? <View style={{ alignItems: 'flex-end', gap: 2 }}>{typeof right === 'string' ? <Txt tabular align="right" muted>{right}</Txt> : right}</View> : null}
    </>
  );
  const base = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    minHeight: mobile ? 56 : 52,
    paddingVertical: 8,
    paddingHorizontal: mobile ? 0 : 12,
    marginHorizontal: mobile ? 0 : -12,
    borderTopWidth: first ? 1 : 0,
    borderTopColor: colors.line,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  };
  if (!onPress) return <View style={base}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={(s) => [base, { backgroundColor: (s as { hovered?: boolean }).hovered || s.pressed ? colors.hover : 'transparent', borderRadius: 0 }]}
    >
      {body}
    </Pressable>
  );
}

/** Abas em linha, sublinhado petróleo no ativo. Contagem tabular ao lado. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const { mobile } = useLayout();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: mobile ? 16 : 24 }}>
        {tabs.map((t) => {
          const on = t.value === value;
          return (
            <Pressable
              key={t.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t.count != null ? `${t.label}, ${t.count}` : t.label}
              onPress={() => onChange(t.value)}
              style={{
                minHeight: mobile ? 44 : 36,
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: on ? colors.petrol600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Txt w={on ? 500 : 400} color={on ? colors.ink : colors.ink2}>
                {t.label}
                {t.count != null ? <Txt tabular color={colors.ink2}>{`  ${t.count}`}</Txt> : null}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Linha única no lugar das linhas, para vazio por filtro. */
export function EmptyLine({ children }: { children: ReactNode }) {
  return <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line2, gap: 4 }}>{children}</View>;
}

/** Bloco de alerta (8px, borda de 1px). */
export function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'pending' | 'error' }) {
  const border = tone === 'error' ? colors.error : tone === 'pending' ? colors.amberIcon : colors.line;
  return (
    <View style={{ borderWidth: 1, borderColor: border, borderLeftWidth: tone === 'neutral' ? 1 : 3, borderRadius: radius.lg, padding: 12, gap: 8, backgroundColor: colors.surface }}>
      {children}
    </View>
  );
}
