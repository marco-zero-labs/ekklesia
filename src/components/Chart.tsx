import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@/theme/tokens';
import { Txt } from './Txt';

export type Series = { label: string; values: (number | null)[]; color: string; dashed?: boolean; strong?: boolean };

/**
 * Gráfico de linha simples (petróleo para o atual, cinza para comparação, média tracejada).
 * Sem grade pesada: só três linhas de referência e rótulos tabulares.
 */
export function LineChart({ labels, series, height = 200, summary }: { labels: string[]; series: Series[]; height?: number; summary: string }) {
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const min = Math.floor((Math.min(...all) - 10) / 50) * 50;
  const max = Math.ceil((Math.max(...all) + 10) / 50) * 50;
  const left = 36;
  const right = 24;
  const top = 8;
  const bottom = 24;
  const w = Math.max(0, width - left - right);
  const h = height - top - bottom;
  const x = (i: number) => left + (labels.length <= 1 ? w / 2 : (i * w) / (labels.length - 1));
  const y = (v: number) => top + h - ((v - min) / (max - min || 1)) * h;
  const ticks = [min, (min + max) / 2, max];
  const path = (vals: (number | null)[]) =>
    vals.reduce<string>((d, v, i) => (v == null ? d : `${d}${d === '' || vals[i - 1] == null ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`), '');

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {series.map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Svg width={18} height={8}>
              <Line x1={0} y1={4} x2={18} y2={4} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '4 3' : undefined} />
            </Svg>
            <Txt v="small" muted>
              {s.label}
            </Txt>
          </View>
        ))}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={summary} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke={colors.line2} strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText key={`l${t}`} x={left - 6} y={y(t) + 4} fontSize={11} fill={colors.ink2} textAnchor="end" fontFamily={fonts[400]}>
                {String(Math.round(t))}
              </SvgText>
            ))}
            {labels.map((l, i) =>
              i % (labels.length > 6 && width < 480 ? 2 : 1) === 0 || i === labels.length - 1 ? (
                <SvgText key={l + i} x={x(i)} y={height - 6} fontSize={11} fill={colors.ink2} textAnchor="middle" fontFamily={fonts[400]}>
                  {l}
                </SvgText>
              ) : null,
            )}
            {series.map((s) => (
              <Path key={s.label} d={path(s.values)} stroke={s.color} strokeWidth={s.strong ? 2 : 1.5} fill="none" strokeDasharray={s.dashed ? '5 4' : undefined} />
            ))}
            {series
              .filter((s) => s.strong)
              .map((s) => {
                const i = s.values.length - 1;
                const v = s.values[i];
                return v == null ? null : <Circle key={`c${s.label}`} cx={x(i)} cy={y(v)} r={3.5} fill={s.color} />;
              })}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

/** Participação nos últimos 8 domingos: 8 pontos (cheio = presente). */
export function Dots({ values, label }: { values: boolean[]; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={label}>
      {values.map((on, i) => (
        <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? colors.petrol600 : colors.surface, borderWidth: 1, borderColor: on ? colors.petrol600 : colors.field }} />
      ))}
    </View>
  );
}

/** Cadeado (dado restrito). */
export function LockIcon({ size = 12, color = colors.ink2 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessibilityElementsHidden>
      <Path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke={color} strokeWidth={1.2} fill="none" />
      <Path d="M2.5 5h7v5.5h-7z" fill={color} />
    </Svg>
  );
}
