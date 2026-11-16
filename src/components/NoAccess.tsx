import { Href } from 'expo-router';
import { Page } from './Page';
import { Txt } from './Txt';

/** Página para quem não tem acesso pela matriz de permissões. */
export function NoAccess({ back = '/', what }: { back?: Href; what: string }) {
  return (
    <Page back={back} title="Sem acesso">
      <Txt muted>Seu perfil não tem acesso a {what}. Peça ao pastor para rever as permissões.</Txt>
    </Page>
  );
}

/** Página para item que não existe (link antigo ou dados apagados). */
export function NotFound({ back, what }: { back: Href; what: string }) {
  return (
    <Page back={back} title={`${what} não encontrado`}>
      <Txt muted>Este endereço não corresponde a nenhum registro. Pode ter sido removido ou os dados de exemplo foram restaurados.</Txt>
    </Page>
  );
}
