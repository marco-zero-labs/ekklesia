import type { Activity, Person } from '@/data/types';
import { normalize, samePhone } from '@/lib/format';

/** "Culto de domingo – noite" → "culto de domingo à noite". */
export function serviceDescription(title: string): string {
  return title
    .replace(/ – noite$/, ' à noite')
    .replace(/ – manhã$/, ' de manhã')
    .replace(/^Culto/, 'culto')
    .replace(/^EBD$/, 'EBD');
}

/** "Dom, 15 nov · noite" */
export function shortActivityLabel(a: Activity, dayLabel: string): string {
  const part = a.title.match(/ – (noite|manhã)$/)?.[1];
  return `${dayLabel} · ${part ?? a.title}`;
}

/** Pessoa já cadastrada com o mesmo telefone (para o aviso de duplicado). */
export function findByPhone(people: Person[], phone: string, exceptId?: string): Person | null {
  return people.find((p) => p.id !== exceptId && samePhone(p.phone, phone)) ?? null;
}

/** Membro encontrado pelo nome digitado em "Quem convidou". */
export function findMember(people: Person[], name: string): Person | null {
  const n = normalize(name);
  if (n.length < 3) return null;
  return people.find((p) => p.kind !== 'visitante' && normalize(p.name) === n) ?? people.find((p) => p.kind !== 'visitante' && normalize(p.name).startsWith(n) && n.includes(' ')) ?? null;
}
