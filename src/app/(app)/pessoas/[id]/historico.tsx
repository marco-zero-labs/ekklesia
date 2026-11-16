import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { DataState } from '@/components/DataState';
import { NoAccess } from '@/components/NoAccess';
import { Page } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useQuery, useViewer } from '@/data/DataProvider';
import { canEditPerson, canSeeAudit } from '@/domain/permissions';
import { fmtWhen, todayDay } from '@/lib/dates';
import { colors } from '@/theme/tokens';

/** Histórico de alterações de um cadastro (a partir da trilha de auditoria). */
export default function Historico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewer = useViewer();
  const q = useQuery(async (r) => ({ person: await r.getPerson(id), audit: await r.listAudit(), people: await r.listPeople() }), [id]);
  if (!canSeeAudit(viewer) && !canEditPerson(viewer)) return <NoAccess back={`/pessoas/${id}`} what="o histórico" />;
  if (!q.data) {
    return (
      <Page back={`/pessoas/${id}`} title="Histórico">
        <DataState error={q.error} reload={q.reload} what="o histórico" />
      </Page>
    );
  }
  const name = (pid: string) => (pid === 'publico' ? 'Ficha pública' : q.data!.people.find((p) => p.id === pid)?.name ?? '');
  const entries = q.data.audit.filter((a) => a.targetId === id);
  const p = q.data.person;
  const today = todayDay();
  return (
    <Page back={`/pessoas/${id}`} title="Histórico" subtitle={p?.name}>
      <View>
        {entries.map((a) => (
          <View key={a.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2, gap: 2 }}>
            <Txt w={500}>{a.action}</Txt>
            <Txt v="small" muted tabular>
              {fmtWhen(a.at, today)} · {name(a.actorId)}
            </Txt>
          </View>
        ))}
        {p ? (
          <View style={{ paddingVertical: 10, gap: 2 }}>
            <Txt w={500}>Cadastro criado</Txt>
            <Txt v="small" muted tabular>
              {fmtWhen(p.createdAt, today)}
            </Txt>
          </View>
        ) : null}
      </View>
    </Page>
  );
}
