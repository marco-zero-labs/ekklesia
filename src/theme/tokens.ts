/**
 * Tokens extraídos de telas/design-system.html (Sistema de design · v0.1 · 16 nov 2026).
 * Não altere os valores sem atualizar o design.
 */
export const colors = {
  ink: '#1C2B2E', // texto principal
  ink2: '#5E6B6D', // texto de apoio
  inkHead: '#3E4B4E', // cabeçalhos de tabela, rótulos
  paper: '#F5F3EF', // sidebar, fundo de apoio
  surface: '#FFFFFF', // área de trabalho
  line: '#E3E1DC', // divisórias, bordas de painel
  line2: '#ECEAE5', // divisória entre linhas, skeleton, desabilitado
  field: '#7E8B8D', // borda de input (3,5:1)
  hover: '#FAF9F7', // hover de linha e de botão secundário
  navActive: '#E9E7E2', // item ativo/hover da sidebar
  petrol50: '#EEF5F6', // linha selecionada
  petrol600: '#0F4C5C', // ação primária, ativo, gráfico
  petrol800: '#0A3540', // hover do primário
  amberText: '#8A5A12', // pendente (texto) · 5,9:1
  amberIcon: '#B7791F', // ícone pendente · só não-texto
  error: '#9A3A2E', // erro · 7,0:1
  chartCompare: '#A9B2B3', // cinza de comparação nos gráficos
} as const;

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 24: 24, 32: 32, 48: 48 } as const;

export const radius = {
  sm: 4, // blocos da agenda, skeleton
  md: 6, // botões, inputs
  lg: 8, // painéis, alertas, toast
} as const;

/** Sombra só em elementos flutuantes: 0 4px 12px rgba(0,0,0,0.08). */
export const floatingShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

export const fonts = {
  400: 'IBMPlexSans_400Regular',
  500: 'IBMPlexSans_500Medium',
  600: 'IBMPlexSans_600SemiBold',
} as const;

export type Weight = keyof typeof fonts;

/** Escala tipográfica (tamanho/altura de linha · peso). */
export const type = {
  title: { fontSize: 20, lineHeight: 28, weight: 600 as Weight }, // título
  number: { fontSize: 28, lineHeight: 32, weight: 500 as Weight }, // número de destaque (tabular)
  body: { fontSize: 14, lineHeight: 20, weight: 400 as Weight }, // corpo (nomes em 500)
  label: { fontSize: 12, lineHeight: 16, weight: 500 as Weight }, // rótulo
  small: { fontSize: 12, lineHeight: 16, weight: 400 as Weight }, // texto de apoio
  mobileBody: { fontSize: 16, lineHeight: 24, weight: 400 as Weight }, // corpo no celular
} as const;

export type TypeVariant = keyof typeof type;

/** Larguras de conteúdo e pontos de quebra. */
export const layout = {
  wide: 1024, // ≥ 1024: sidebar; abaixo: abas embaixo
  sidebar: 232,
  content: 720, // listas e páginas de item
  home: 640, // Início
  pagePadDesktop: 32,
  pagePadMobile: 16,
  touch: 44, // alvo de toque mínimo no celular
  primaryMobile: 48, // botão principal no celular
  controlDesktop: 32,
} as const;
