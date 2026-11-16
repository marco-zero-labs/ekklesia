import { DataState } from '@/components/DataState';
import { NoAccess } from '@/components/NoAccess';
import { Page } from '@/components/Page';
import { PersonForm } from '@/components/PersonForm';
import { useViewer } from '@/data/DataProvider';
import { useAppData } from '@/data/useAppData';
import { canEditPerson } from '@/domain/permissions';

export default function NovaPessoa() {
  const viewer = useViewer();
  const q = useAppData();
  if (!canEditPerson(viewer)) return <NoAccess back="/pessoas" what="cadastrar pessoas" />;
  if (!q.data) {
    return (
      <Page back="/pessoas" title="Nova pessoa">
        <DataState error={q.error} reload={q.reload} />
      </Page>
    );
  }
  return <PersonForm d={q.data} />;
}
