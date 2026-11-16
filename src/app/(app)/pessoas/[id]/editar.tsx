import { useLocalSearchParams } from 'expo-router';
import { DataState } from '@/components/DataState';
import { NoAccess, NotFound } from '@/components/NoAccess';
import { Page } from '@/components/Page';
import { PersonForm } from '@/components/PersonForm';
import { useViewer } from '@/data/DataProvider';
import { useAppData } from '@/data/useAppData';
import { canEditPerson } from '@/domain/permissions';

export default function EditarPessoa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewer = useViewer();
  const q = useAppData();
  if (!canEditPerson(viewer)) return <NoAccess back={`/pessoas/${id}`} what="editar cadastros" />;
  if (!q.data) {
    return (
      <Page back={`/pessoas/${id}`} title="Editar cadastro">
        <DataState error={q.error} reload={q.reload} />
      </Page>
    );
  }
  const p = q.data.byId.get(id);
  if (!p) return <NotFound back="/pessoas" what="Cadastro" />;
  return <PersonForm d={q.data} person={p} />;
}
