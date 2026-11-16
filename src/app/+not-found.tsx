import { Page } from '@/components/Page';
import { Txt } from '@/components/Txt';

export default function NaoEncontrada() {
  return (
    <Page back="/" title="Página não encontrada">
      <Txt muted>Este endereço não existe no Ekklesia.</Txt>
    </Page>
  );
}
