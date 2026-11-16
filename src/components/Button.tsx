import { ActivityIndicator, Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';
import { Txt } from './Txt';

type Kind = 'primary' | 'secondary' | 'text';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  kind?: Kind;
  loading?: boolean;
  /** Botão principal: no celular fica com 48px e largura total. */
  main?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Ocupa a largura toda. */
  block?: boolean;
  /** Força altura compacta (32px) mesmo no celular — use só fora de alvos de toque. */
  compact?: boolean;
};

/** Altura 32px (44px no celular, 48px no principal), padding 12px, peso 500. O botão diz o que faz. */
export function Button({ label, kind = 'secondary', loading, main, disabled, style, compact, block, ...rest }: Props) {
  const { mobile } = useLayout();
  const isDisabled = disabled || loading;
  const height = compact ? 32 : mobile ? (main ? 48 : 44) : 32;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      accessibilityLabel={rest.accessibilityLabel ?? label}
      disabled={isDisabled}
      {...rest}
      style={(state) => {
        const hovered = (state as { hovered?: boolean }).hovered;
        const pressed = state.pressed;
        let bg: string = colors.surface;
        let border: string = colors.field;
        if (kind === 'primary') {
          bg = hovered || pressed ? colors.petrol800 : colors.petrol600;
          border = bg;
        } else if (kind === 'secondary') {
          bg = hovered || pressed ? colors.hover : colors.surface;
        } else {
          bg = pressed ? colors.hover : 'transparent';
          border = 'transparent';
        }
        if (disabled) {
          bg = kind === 'primary' ? colors.line2 : kind === 'text' ? 'transparent' : colors.surface;
          border = kind === 'text' ? 'transparent' : colors.line;
        }
        return [
          {
            height,
            minWidth: mobile && !compact ? 44 : undefined,
            paddingHorizontal: mobile && !compact ? 16 : 12,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: loading ? 0.85 : 1,
            alignSelf: (main && mobile) || block ? 'stretch' : 'flex-start',
          } as ViewStyle,
          style,
        ];
      }}
    >
      {loading ? <ActivityIndicator size="small" color={kind === 'primary' ? '#fff' : colors.ink2} /> : null}
      <Txt
        w={500}
        v="body"
        color={
          disabled ? colors.ink2 : kind === 'primary' ? '#FFFFFF' : kind === 'text' ? colors.petrol600 : colors.ink
        }
        style={!mobile ? { fontSize: 14, lineHeight: 20 } : undefined}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

/** Link em texto (petróleo, peso 500), com alvo de toque de 44px no celular. */
export function TextLink({ label, onPress, accessibilityLabel, small }: { label: string; onPress: () => void; accessibilityLabel?: string; small?: boolean }) {
  const { mobile } = useLayout();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={8}
      style={(s) => ({
        minHeight: mobile ? 44 : undefined,
        justifyContent: 'center',
        alignSelf: 'flex-start',
        opacity: s.pressed ? 0.7 : 1,
      })}
    >
      {(s) => (
        <Txt
          v={small ? 'small' : 'body'}
          w={500}
          color={(s as { hovered?: boolean }).hovered ? colors.ink : colors.petrol600}
        >
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

export function ButtonRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { mobile } = useLayout();
  return (
    <View style={[{ flexDirection: mobile ? 'column-reverse' : 'row', gap: mobile ? 8 : 12, alignItems: mobile ? 'stretch' : 'center' }, style]}>
      {children}
    </View>
  );
}
