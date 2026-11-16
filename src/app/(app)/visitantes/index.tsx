import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { EmptyLine, Row, Tabs } from '@/components/List';
import { Page } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useViewer } from '@/data/DataProvider';
import { STAGES, Stage } from '@/data/types';
import { isVisitor, useAppData } from '@/data/useAppData';
import { byDue } from '@/domain/followup';
import { canManageVisitors, canSeeVisitor } from '@/domain/permissions';
import { diffDays, dueLabel, todayDay } from '@/lib/dates';
import { useLayout } from '@/theme/useLayout';

type Tab = 'todos' | Exclude<Stage, 'membro'>;

export default function Visitantes() {
  const viewer = useViewer();
  const { wide } = useLayout();
  const q = useAppData();
  const [tab, setTab] = useState<Tab>('todos');
  const canNew = canManageVisitors(viewer);
  const action = canNew ? <Button kind="primary" main label="Novo visitante" onPress={() => router.push('/visitantes/novo')} /> : undefined;

  if (!q.data) {
    return (
      <Page title="Visitantes" action={action}>
        <DataState error={q.error} reload={q.reload} what="os visitantes" />
      </Page>
    );
  }
  const d = q.data;
  const today = todayDay();
  const all = d.people.filter((p) => isVisitor(p) && canSeeVisitor(viewer, p));
  const becameMembers = d.people.filter(
    (p) => p.followUp?.stage === 'membro' && p.followUp.stageHistory.some((h) => h.to === 'membro' && diffDays(h.at.slice(0, 10), today) <= 90),
  ).length;
  const count = (s: Tab) => (s === 'todos' ? all.length : all.filter((p) => p.followUp!.stage === s).length);
  const list = all.filter((p) => tab === 'todos' || p.followUp!.stage === tab).sort(byDue);
  const subtitle = [
    viewer.profile === 'lider' ? `${all.length} atribuídos a você` : `${all.length} em acompanhamento`,
    becameMembers ? `${becameMembers} ${becameMembers === 1 ? 'virou membro' : 'viraram membros'} nos últimos 90 dias` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Page title="Visitantes" subtitle={subtitle} action={action}>
      <Tabs<Tab>
        label="Etapas"
        value={tab}
        onChange={setTab}
        tabs={[{ value: 'todos', label: 'Todos', count: count('todos') }, ...STAGES.filter((s) => s.value !== 'membro').map((s) => ({ value: s.value as Tab, label: s.label, count: count(s.value as Tab) }))]}
      />
      <View>
        {list.length === 0 ? (
          <EmptyLine>
            <Txt muted>Nenhum visitante nesta etapa.</Txt>
          </EmptyLine>
        ) : (
          list.map((p) => {
            const fu = p.followUp!;
            const due = fu.nextContact ? dueLabel(fu.nextContact, today) : null;
            const resp = fu.responsibleId ? d.name(fu.responsibleId) : 'Sem responsável';
            const situation = due ? due.overdue ? <Pending v="small">{due.text}</Pending> : <Txt v="small" muted>{due.text}</Txt> : <Txt v="small" muted>Sem próximo contato</Txt>;
            return (
              <Row
                key={p.id}
                title={p.name}
                subtitle={
                  wide ? (
                    situation
                  ) : (
                    <Txt v="small" muted>
                      {situation}
                      {` · ${resp}`}
                    </Txt>
                  )
                }
                right={wide ? <Txt v="small" muted align="right">{resp}</Txt> : undefined}
                accessibilityLabel={`${p.name}, ${due?.text ?? 'sem próximo contato'}, ${resp}`}
                onPress={() => router.push(`/visitantes/${p.id}`)}
              />
            );
          })
        )}
      </View>
    </Page>
  );
}
