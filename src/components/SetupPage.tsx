import { router } from 'expo-router';
import { ReactNode } from 'react';
import { View } from 'react-native';
import { TextLink } from './Button';
import { Page } from './Page';
import { Txt } from './Txt';
import { colors } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';

export const SETUP_STEPS = [
  { href: '/configuracao-inicial', label: 'Dados da igreja' },
  { href: '/configuracao-inicial/cultos', label: 'Cultos recorrentes' },
  { href: '/configuracao-inicial/ministerios', label: 'Ministérios' },
  { href: '/configuracao-inicial/importar', label: 'Importar pessoas' },
] as const;

/** Página de etapa da configuração inicial: sem menu, com "Sair e continuar depois". */
export function SetupPage({ step, title, subtitle, children, footer }: { step: 1 | 2 | 3 | 4; title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { wide } = useLayout();
  return (
    <Page bare maxWidth={720} footer={footer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Txt w={600}>Limen · Configuração inicial</Txt>
        <TextLink small label="Sair e continuar depois" onPress={() => router.replace('/')} />
      </View>
      <View style={{ gap: 6 }}>
        <Txt v="label" color={colors.inkHead} tabular>
          Etapa {step} de 4
        </Txt>
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden>
          {SETUP_STEPS.map((s, i) => (
            <View key={s.href} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? colors.petrol600 : colors.line2 }} />
          ))}
        </View>
        <Txt v="small" muted>
          {SETUP_STEPS[step - 1].label}
          {step < 4 ? ` · depois: ${SETUP_STEPS[step as 1 | 2 | 3].label}` : ''}
        </Txt>
      </View>
      <View style={{ gap: 4 }}>
        <Txt v="title" accessibilityRole="header">
          {title}
        </Txt>
        <Txt muted>{subtitle}</Txt>
      </View>
      {children}
      {wide ? <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 8 }}>{footer}</View> : null}
    </Page>
  );
}

/** Barra de ações das etapas: no celular vai para o rodapé fixo; no desktop, dentro da página. */
export function SetupActions({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>{children}</View>;
}
