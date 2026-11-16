import { describe, expect, test } from '@jest/globals';
import { parseCsv, toCsv } from '../src/lib/csv';
import { convertRows, guessMapping, SAMPLE_CSV } from '../src/domain/importer';
import { scheduleStatus } from '../src/domain/activities';
import type { Schedule } from '../src/data/types';

describe('CSV', () => {
  test('separador ; com aspas e quebra de linha', () => {
    expect(parseCsv('NOME;OBS\r\n"Silva, Ana";"diz ""oi"""\n')).toEqual([
      ['NOME', 'OBS'],
      ['Silva, Ana', 'diz "oi"'],
    ]);
  });
  test('separador , e linhas vazias', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  test('ida e volta', () => {
    expect(parseCsv(toCsv([['Nome', 'Obs'], ['Ana', 'x;y']]))).toEqual([
      ['Nome', 'Obs'],
      ['Ana', 'x;y'],
    ]);
  });
});

describe('importação de planilha', () => {
  const data = parseCsv(SAMPLE_CSV);
  test('reconhece as colunas pelo cabeçalho', () => {
    expect(guessMapping(data[0])).toEqual(['name', 'phone', 'birthDate', 'address', 'ministry', 'memberSince', 'skip']);
  });
  test('converte linhas e conta pendências', () => {
    const r = convertRows(data.slice(1), guessMapping(data[0]));
    expect(r.rows).toHaveLength(5);
    expect(r.rows[0]).toMatchObject({ name: 'Rosilda Ferreira Lins', phone: '(81) 99620-1144', birthDate: '1972-02-14', ministry: 'Recepção' });
    expect(r.noPhone).toBe(1);
    expect(r.badDates).toBe(1); // "1979"
  });
});

describe('situação da escala', () => {
  const s = (slots: Schedule['slots']): Schedule => ({ id: 'x', ministryId: 'm', activityId: 'a', slots });
  test('falta, sem resposta e completa', () => {
    expect(scheduleStatus(s([{ id: '1', role: 'Bateria', personId: null, status: 'aguardando' }])).text).toBe('Falta 1');
    expect(scheduleStatus(s([{ id: '1', role: 'Baixo', personId: 'p', status: 'aguardando' }])).text).toBe('1 sem resposta');
    expect(scheduleStatus(s([{ id: '1', role: 'Som', personId: 'p', status: 'confirmado' }]))).toMatchObject({ text: 'Completa', pending: false });
    expect(scheduleStatus(s([{ id: '1', role: 'Som', personId: 'p', status: 'recusou' }])).text).toBe('Falta 1');
  });
});
