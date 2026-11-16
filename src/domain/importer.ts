/** Importação de planilha: lê as colunas, sugere o campo de cada uma e converte as linhas. */
import { ImportRow } from '@/data/repository';
import { parseBrDate } from '@/lib/dates';
import { formatPhone, isValidPhone, normalize } from '@/lib/format';

export type ImportField = 'name' | 'phone' | 'birthDate' | 'address' | 'ministry' | 'memberSince' | 'email' | 'skip';

export const FIELD_LABEL: Record<ImportField, string> = {
  name: 'Nome',
  phone: 'Telefone',
  birthDate: 'Nascimento',
  address: 'Endereço',
  ministry: 'Ministério',
  memberSince: 'Membro desde',
  email: 'E-mail',
  skip: 'Não importar',
};

const GUESS: [RegExp, ImportField][] = [
  [/^(nome|nome completo|membro|pessoa)$/, 'name'],
  [/(celular|telefone|fone|whats)/, 'phone'],
  [/(nasc|aniver)/, 'birthDate'],
  [/(ender|rua|logradouro)/, 'address'],
  [/(minist|departamento)/, 'ministry'],
  [/(batismo|membro desde|admiss)/, 'memberSince'],
  [/(e-?mail)/, 'email'],
];

/** Sugere o campo de cada coluna pelo cabeçalho ("DT NASC" → Nascimento). */
export function guessMapping(header: string[]): ImportField[] {
  const used = new Set<ImportField>();
  return header.map((h) => {
    const n = normalize(h).replace(/[_.]/g, ' ').replace(/\s+/g, ' ');
    const hit = GUESS.find(([re, f]) => re.test(n) && !used.has(f));
    const f = hit ? hit[1] : 'skip';
    if (f !== 'skip') used.add(f);
    return f;
  });
}

export type ImportPreview = { rows: ImportRow[]; badDates: number; noPhone: number; noName: number };

export function convertRows(data: string[][], mapping: ImportField[]): ImportPreview {
  let badDates = 0;
  let noPhone = 0;
  let noName = 0;
  const rows: ImportRow[] = [];
  for (const line of data) {
    const get = (f: ImportField) => {
      const i = mapping.indexOf(f);
      return i >= 0 ? (line[i] ?? '').trim() : '';
    };
    const name = get('name');
    if (!name) {
      noName++;
      continue;
    }
    const date = (f: ImportField) => {
      const v = get(f);
      if (!v) return undefined;
      const d = parseBrDate(v);
      if (!d) badDates++;
      return d ?? undefined;
    };
    const phoneRaw = get('phone');
    const phone = phoneRaw && isValidPhone(phoneRaw) ? formatPhone(phoneRaw) : undefined;
    if (!phone) noPhone++;
    rows.push({
      name,
      phone,
      birthDate: date('birthDate'),
      address: get('address') || undefined,
      ministry: get('ministry') || undefined,
      memberSince: date('memberSince'),
      email: get('email') || undefined,
    });
  }
  return { rows, badDates, noPhone, noName };
}

/** Planilha de exemplo (para demonstrar a importação sem arquivo). */
export const SAMPLE_CSV = [
  'NOME COMPLETO;CELULAR;DT NASC;ENDERECO;MINISTERIO;DT BATISMO;OBS',
  'Rosilda Ferreira Lins;81996201144;14/02/1972;Rua Projetada 22, Bairro Novo;Recepção;10/05/2001;',
  'Edvaldo Bezerra Moura;81988127730;03/09/1965;Rua do Sol 101, Bairro Novo;Diaconia;20/11/1990;tesoureiro antigo',
  'Joelma Cavalcanti;;27/07/1988;Av. Getúlio Vargas 55, Olinda;Infantil;;',
  'Givaldo Pereira Souza;81991543320;1979;Rua das Flores 9, Bairro Novo;Louvor;15/08/2010;data incompleta',
  'Socorro Andrade Lima;8134451209;19/12/1950;Rua Projetada 31, Bairro Novo;Intercessão;01/03/1975;',
].join('\n');

export const TEMPLATE_CSV = '﻿NOME COMPLETO;CELULAR;DT NASC;ENDERECO;MINISTERIO;DT BATISMO;E-MAIL\r\nMaria da Silva;(81) 99999-0000;12/03/1961;Rua Projetada 12, Bairro Novo;Recepção;14/06/1998;maria@exemplo.com\r\n';
