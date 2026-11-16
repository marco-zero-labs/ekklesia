import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { NoAccess } from '@/components/NoAccess';
import { Page, Section } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useQuery, useViewer } from '@/data/DataProvider';
import { ProfileKind, USERS } from '@/data/types';
import { AREAS, canSeeAudit, LEVEL_TEXT, MATRIX } from '@/domain/permissions';
import { fmtWhen, todayDay } from '@/lib/dates';
import { colors } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';

const PROFILES: { kind: ProfileKind; label: string }[] = [
  { kind: 'pastor', label: 'Pastor' },
  { kind: 'secretaria', label: 'Secretaria' },
  { kind: 'lider', label: 'Líder de ministério' },
];

export default function Permissoes() {
  const viewer = useViewer();
  const { wide } = useLayout();
  const [limit, setLimit] = useState(20);
  const q = useQuery(async (r) => ({ audit: await r.listAudit(), people: await r.listPeople() }));
  if (!canSeeAudit(viewer)) return <NoAccess what="permissões e auditoria" />;
  const subtitle = 'Dados de participação religiosa são sensíveis pela LGPD; cada acesso fica registrado.';
  if (!q.data) {
    return (
      <Page back="/" title="Permissões" subtitle={subtitle}>
        <DataState error={q.error} reload={q.reload} what="a auditoria" />
      </Page>
    );
  }
  const name = (id: string) => (id === 'publico' ? 'Link público' : q.data!.people.find((p) => p.id === id)?.name ?? id);
  const today = todayDay();
  const cell = (k: ProfileKind, area: (typeof AREAS)[number]['area']) => LEVEL_TEXT[area][MATRIX[k][area]] ?? '';

  return (
    <Page back="/" title="Permissões" subtitle={subtitle}>
      <Section title="Perfis">
        {wide ? (
          <View accessibilityRole="none">
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 8 }}>
              <Txt v="label" color={colors.inkHead} style={{ flex: 1.4 }}>
                Área
              </Txt>
              {PROFILES.map((p) => (
                <Txt key={p.kind} v="label" color={colors.inkHead} style={{ flex: 1 }}>
                  {p.label}
                </Txt>
              ))}
            </View>
            {AREAS.map((a) => (
              <View key={a.area} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line2, paddingVertical: 10 }}>
                <Txt w={500} style={{ flex: 1.4, fontSize: 14 }}>
                  {a.label}
                </Txt>
                {PROFILES.map((p) => (
                  <Txt key={p.kind} style={{ flex: 1, fontSize: 14 }} muted={MATRIX[p.kind][a.area] === 'nenhum'}>
                    {cell(p.kind, a.area)}
                  </Txt>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View>
            {AREAS.map((a) => (
              <View key={a.area} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2, gap: 4 }}>
                <Txt w={500}>{a.label}</Txt>
                {PROFILES.map((p) => (
                  <Txt key={p.kind} v="small" muted>
                    {p.label}: {cell(p.kind, a.area)}
                  </Txt>
                ))}
              </View>
            ))}
          </View>
        )}
        <Txt v="small" muted>
          Pedido de oração é visível só para o pastor. Perfis desta demonstração: {Object.values(USERS).map((u) => `${u.label} (${name(u.personId)})`).join(', ')}.
        </Txt>
      </Section>

      <Section title="Trilha de auditoria" right={<Txt v="small" muted tabular>{`${q.data.audit.length} registros`}</Txt>}>
        <View>
          {q.data.audit.slice(0, limit).map((a) => (
            <View key={a.id} style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 16 : 2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
              <Txt v="small" muted tabular style={wide ? { width: 110, paddingTop: 2 } : undefined}>
                {fmtWhen(a.at, today)}
              </Txt>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt>
                  <Txt w={500}>{name(a.actorId)}</Txt> · {a.action}
                </Txt>
                {a.target ? (
                  <Txt v="small" muted>
                    {a.target}
                  </Txt>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        {q.data.audit.length > limit ? <Button label="Mostrar mais" onPress={() => setLimit((l) => l + 30)} /> : null}
      </Section>
    </Page>
  );
}
