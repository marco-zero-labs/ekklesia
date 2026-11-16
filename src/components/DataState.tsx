import { ErrorBlock, SkeletonList } from './Feedback';

/** Carregando (skeleton após 400ms) ou erro com "Tentar de novo". */
export function DataState({ error, reload, what = 'os dados' }: { error: Error | null; reload: () => void; what?: string }) {
  if (error) {
    const now = new Date();
    const hh = `${now.getHours()}h${String(now.getMinutes()).padStart(2, '0')}`;
    return <ErrorBlock title={`Não foi possível carregar ${what}`} body={`A conexão caiu às ${hh}. Nenhum dado foi perdido: o que estava salvo continua salvo.`} onRetry={reload} />;
  }
  return <SkeletonList label={`Carregando ${what}`} />;
}
