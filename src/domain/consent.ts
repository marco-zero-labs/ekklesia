import { Consent } from '@/data/types';
import { DateTime, fmtDayMonth } from '@/lib/dates';
import { firstName } from '@/lib/format';

/** Texto do consentimento numa página de pessoa: "Dado em 25 out por ficha digital". */
export function consentText(c: Consent): { text: string; pending: boolean; note?: string } {
  const when = (at?: DateTime) => (at ? ` em ${fmtDayMonth(at.slice(0, 10))}` : '');
  switch (c.status) {
    case 'dado':
      return { text: `Dado${when(c.at)}${c.via ? ` por ${c.via}` : ''}`, pending: false };
    case 'verbal':
      return { text: `Verbal${when(c.at)}${c.via?.startsWith('verbal') ? c.via.replace(/^verbal/, '') : ''}`, pending: true, note: 'Precisa de confirmação por escrito depois.' };
    case 'recusado':
      return { text: `Recusado${when(c.at)}`, pending: false, note: 'Use só o necessário para o contato combinado.' };
    default:
      return {
        text: 'Pendente',
        pending: true,
        note: c.requestedAt ? `Pedido enviado em ${fmtDayMonth(c.requestedAt.slice(0, 10))}.` : c.via ? capital(c.via) : undefined,
      };
  }
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Mensagem do pedido de consentimento pelo WhatsApp (prévia do design). */
export function consentMessage(personName: string, churchName: string, link: string): string {
  return `Olá, ${firstName(personName)}. A ${churchName} está atualizando o cadastro e precisa da sua autorização para guardar seus dados (nome, telefone, endereço e participação nos ministérios). Leva menos de um minuto: ${link}`;
}
