import { useState } from 'react';
import { Platform, Pressable, StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';
import { Txt } from './Txt';

type FieldProps = Omit<TextInputProps, 'style' | 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  /** Formata enquanto digita (telefone, CEP, data). */
  mask?: (s: string) => string;
  help?: string;
  error?: string | null;
  /** Texto à direita do rótulo, ex.: "(opcional)". */
  optional?: boolean;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Conteúdo logo abaixo do campo (ex.: aviso de duplicado com link). */
  below?: React.ReactNode;
  tabular?: boolean;
};

/** Rótulo sempre acima; validação ao sair do campo; erro em texto abaixo. */
export function Field(
  { label, value, onChangeText, mask, help, error, optional, multiline, style, below, tabular, editable = true, onBlur, onFocus, ...rest }: FieldProps,
) {
  const { mobile } = useLayout();
  const [focused, setFocused] = useState(false);
  const height = multiline ? undefined : mobile ? 44 : 32;
  const border = error ? colors.error : focused ? colors.petrol600 : colors.field;
  return (
    <View style={[{ gap: 4 }, style]}>
      <Txt v="label" color={colors.inkHead} nativeID={`lbl-${label}`}>
        {label}
        {optional ? <Txt v="small" muted> (opcional)</Txt> : null}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        aria-labelledby={`lbl-${label}`}
        value={value}
        editable={editable}
        onChangeText={(s) => onChangeText(mask ? mask(s) : s)}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        multiline={multiline}
        placeholderTextColor={colors.ink2}
        {...rest}
        style={[
          {
            height,
            minHeight: multiline ? 88 : undefined,
            paddingHorizontal: 12,
            paddingVertical: multiline ? 8 : 0,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: editable ? colors.surface : colors.line2,
            color: editable ? colors.ink : colors.ink2,
            fontFamily: fonts[400],
            fontSize: mobile ? 16 : 14,
            lineHeight: mobile ? 24 : 20,
            textAlignVertical: multiline ? 'top' : 'center',
            fontVariant: tabular ? ['tabular-nums'] : undefined,
          },
          Platform.OS === 'web' && focused ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.petrol600, outlineOffset: 1 } as object) : null,
        ]}
      />
      {error ? (
        <Txt v="small" color={colors.error} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : help ? (
        <Txt v="small" muted>
          {help}
        </Txt>
      ) : null}
      {below}
    </View>
  );
}

export type Option<T extends string> = { value: T; label: string; hint?: string };

/**
 * Escolha única. `layout="inline"` mostra opções lado a lado (Tipo, Resultado);
 * `layout="list"` empilha opções com explicação (Consentimento).
 */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  layout = 'inline',
  help,
}: {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  layout?: 'inline' | 'list';
  help?: string;
}) {
  const { mobile } = useLayout();
  return (
    <View style={{ gap: 4 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Txt v="label" color={colors.inkHead}>
        {label}
      </Txt>
      <View style={{ flexDirection: layout === 'inline' ? 'row' : 'column', flexWrap: 'wrap', gap: layout === 'inline' ? 8 : 4 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.hint ? `${o.label}. ${o.hint}` : o.label}
              onPress={() => onChange(o.value)}
              style={(s) => [
                layout === 'inline'
                  ? {
                      minHeight: mobile ? 44 : 32,
                      paddingHorizontal: 12,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: on ? colors.petrol600 : colors.field,
                      backgroundColor: on ? colors.petrol50 : (s as { hovered?: boolean }).hovered ? colors.hover : colors.surface,
                      justifyContent: 'center',
                    }
                  : {
                      flexDirection: 'row',
                      gap: 12,
                      paddingVertical: 8,
                      minHeight: mobile ? 44 : 36,
                      alignItems: 'flex-start',
                    },
              ]}
            >
              {layout === 'list' ? (
                <>
                  <RadioDot on={on} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt w={on ? 500 : 400}>{o.label}</Txt>
                    {o.hint ? (
                      <Txt v="small" muted>
                        {o.hint}
                      </Txt>
                    ) : null}
                  </View>
                </>
              ) : (
                <Txt w={500} color={on ? colors.petrol600 : colors.ink}>
                  {o.label}
                </Txt>
              )}
            </Pressable>
          );
        })}
      </View>
      {help ? (
        <Txt v="small" muted>
          {help}
        </Txt>
      ) : null}
    </View>
  );
}

function RadioDot({ on }: { on: boolean }) {
  return (
    <View
      style={{
        marginTop: 2,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: on ? colors.petrol600 : colors.field,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.petrol600 }} /> : null}
    </View>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  error,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  error?: string | null;
}) {
  const { mobile } = useLayout();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: mobile ? 44 : 32, paddingVertical: 4 }}
      >
        <View
          style={{
            marginTop: 2,
            width: 18,
            height: 18,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: error ? colors.error : checked ? colors.petrol600 : colors.field,
            backgroundColor: checked ? colors.petrol600 : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Txt v="small" w={600} color="#fff" style={{ lineHeight: 14 }}>✓</Txt> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt>{label}</Txt>
          {hint ? (
            <Txt v="small" muted>
              {hint}
            </Txt>
          ) : null}
        </View>
      </Pressable>
      {error ? (
        <Txt v="small" color={colors.error}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}
