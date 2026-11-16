import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { SkeletonList, ErrorBlock } from '@/components/Feedback';
import { Field } from '@/components/Field';
import { EmptyLine, Row } from '@/components/List';
import { Page } from '@/components/Page';
import { Txt } from '@/components/Txt';
import { useQuery, useViewer } from '@/data/DataProvider';
import { canSeePerson, canSeeVisitor } from '@/domain/permissions';
import { normalize, onlyDigits } from '@/lib/format';

/** Busca de pessoas por nome ou telefone (⌘K / Ctrl+K na web). O resultado abre a página da pessoa. */
export default function Busca() {
  const viewer = useViewer();
  const [q, setQ] = useState('');
  const data = useQuery(async (r) => ({ people: await r.listPeople(), ministries: await r.listMinistries(), services: await r.listServices() }));
  const results = useMemo(() => {
    if (!data.data || q.trim().length < 2) return [];
    const n = normalize(q);
    const digits = onlyDigits(q);
    return data.data.people
      .filter((p) => (p.followUp && p.followUp.stage !== 'membro' ? canSeeVisitor(viewer, p) : canSeePerson(viewer, p, data.data!.ministries, data.data!.services)))
      .filter((p) => normalize(p.name).includes(n) || (digits.length >= 3 && onlyDigits(p.phone ?? '').includes(digits)))
      .sort((a, b) => {
        const sa = normalize(a.name).startsWith(n) ? 0 : 1;
        const sb = normalize(b.name).startsWith(n) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name, 'pt-BR');
      })
      .slice(0, 20);
  }, [data.data, q, viewer]);

  return (
    <Page back="/" title="Buscar pessoa">
      <Field label="Nome ou telefone" value={q} onChangeText={setQ} autoFocus placeholder="Ex.: Raimunda ou 99812" returnKeyType="search" onSubmitEditing={() => results[0] && router.replace(`/pessoas/${results[0].id}`)} />
      {data.loading ? (
        <SkeletonList rows={3} />
      ) : data.error ? (
        <ErrorBlock title="Não foi possível buscar" body="Nenhum dado foi perdido." onRetry={data.reload} />
      ) : q.trim().length < 2 ? (
        <Txt muted>Digite pelo menos 2 letras do nome ou 3 números do telefone.</Txt>
      ) : results.length === 0 ? (
        <EmptyLine>
          <Txt>Ninguém com “{q.trim()}” no nome ou telefone.</Txt>
        </EmptyLine>
      ) : (
        <View>
          {results.map((p, i) => (
            <Row
              key={p.id}
              first={i === 0}
              title={p.name}
              subtitle={[p.followUp && p.followUp.stage !== 'membro' ? 'Visitante' : p.kind === 'membro' ? 'Membro' : 'Congregado', p.phone].filter(Boolean).join(' · ')}
              onPress={() => router.replace(p.followUp && p.followUp.stage !== 'membro' ? `/visitantes/${p.id}` : `/pessoas/${p.id}`)}
            />
          ))}
        </View>
      )}
    </Page>
  );
}
