import { describe, expect, test } from '@jest/globals';
import { addDays, dueLabel, fmtDayShort, fmtWhen, greeting, lastSunday, parseBrDate, startOfWeek } from '../src/lib/dates';
import { firstName, formatPhone, isValidPhone, samePhone, whatsappLink } from '../src/lib/format';

describe('datas', () => {
  const hoje = '2026-11-16'; // segunda-feira

  test('situação do próximo contato', () => {
    expect(dueLabel('2026-11-12', hoje)).toEqual({ text: 'Vencido há 4 dias', overdue: true });
    expect(dueLabel('2026-11-15', hoje)).toEqual({ text: 'Vencido ontem', overdue: true });
    expect(dueLabel(hoje, hoje)).toEqual({ text: 'Hoje', overdue: false });
    expect(dueLabel('2026-11-17', hoje).text).toBe('Amanhã');
    expect(dueLabel('2026-11-18', hoje).text).toBe('Qua, 18 nov');
  });

  test('último domingo e semana', () => {
    expect(lastSunday(hoje)).toBe('2026-11-15');
    expect(lastSunday('2026-11-22')).toBe('2026-11-15'); // domingo: o anterior
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
    expect(fmtDayShort(addDays(hoje, 2))).toBe('Qua, 18 nov');
  });

  test('quando algo aconteceu', () => {
    expect(fmtWhen('2026-11-16T11:48', hoje)).toBe('Hoje, 11h48');
    expect(fmtWhen('2026-11-15T21:05', hoje)).toBe('Ontem, 21h05');
    expect(fmtWhen('2026-11-12T14:32', hoje)).toBe('12 nov, 14h32');
  });

  test('saudação pelo horário', () => {
    expect(greeting(new Date(2026, 10, 16, 8))).toBe('Bom dia');
    expect(greeting(new Date(2026, 10, 16, 14))).toBe('Boa tarde');
    expect(greeting(new Date(2026, 10, 16, 20))).toBe('Boa noite');
  });

  test('data brasileira', () => {
    expect(parseBrDate('12/03/1961')).toBe('1961-03-12');
    expect(parseBrDate('31/02/2000')).toBeNull();
    expect(parseBrDate('1961-03-12')).toBeNull();
  });
});

describe('formatação', () => {
  test('telefone aceita só dígitos e mostra formatado', () => {
    expect(formatPhone('81998124407')).toBe('(81) 99812-4407');
    expect(formatPhone('8134271180')).toBe('(81) 3427-1180');
    expect(isValidPhone('(81) 9981')).toBe(false);
    expect(samePhone('(81) 99701-2265', '81997012265')).toBe(true);
  });
  test('link do WhatsApp', () => {
    expect(whatsappLink('(81) 99812-4407', 'Oi, Lucas')).toBe('https://wa.me/5581998124407?text=Oi%2C%20Lucas');
  });
  test('primeiro nome', () => {
    expect(firstName('Maria das Graças Nascimento Silva')).toBe('Maria das Graças');
    expect(firstName('Lucas Ferreira')).toBe('Lucas');
    expect(firstName('Ana Paula Ribeiro')).toBe('Ana Paula');
    expect(firstName('Rafael e Priscila Monteiro')).toBe('Rafael e Priscila');
    expect(firstName('Pedro Henrique e Mariana Costa')).toBe('Pedro Henrique e Mariana');
  });
});
