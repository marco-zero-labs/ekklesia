import { Text, TextProps, TextStyle, StyleProp } from 'react-native';
import { colors, fonts, type as scale, TypeVariant, Weight } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';

type Props = TextProps & {
  v?: TypeVariant;
  w?: Weight;
  color?: string;
  muted?: boolean;
  amber?: boolean;
  tabular?: boolean;
  align?: 'left' | 'right' | 'center';
  style?: StyleProp<TextStyle>;
};

/**
 * Texto do Ekklesia. Nunca corta com reticências (não use numberOfLines).
 * O corpo passa a 16/24 no celular, como no design.
 */
export function Txt({ v = 'body', w, color, muted, amber, tabular, align, style, ...rest }: Props) {
  const { mobile } = useLayout();
  const variant = v === 'body' && mobile ? 'mobileBody' : v;
  const s = scale[variant];
  const weight = w ?? s.weight;
  const c = color ?? (amber ? colors.amberText : muted ? colors.ink2 : colors.ink);
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fonts[weight],
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          color: c,
          textAlign: align,
          fontVariant: tabular ? ['tabular-nums'] : undefined,
          letterSpacing: v === 'title' ? -0.2 : undefined,
        },
        style,
      ]}
    />
  );
}

/** Texto com cor âmbar e peso 500 — só para "atrasado/pendente". Sempre com palavras, nunca só cor. */
export function Pending(props: Omit<Props, 'amber'>) {
  return <Txt amber w={500} {...props} />;
}
