/** Chamada nominal: quem é marcado sai de "Faltam" e vai para "Presentes". Funções puras. */

export interface ChamadaState {
  roster: string[];
  present: string[];
}

/** Faltam: quem está na lista e ainda não foi marcado, na ordem da lista. */
export function faltam(s: ChamadaState): string[] {
  const set = new Set(s.present);
  return s.roster.filter((id) => !set.has(id));
}

/** Presentes: na ordem em que foram marcados (o último no topo fica mais fácil de desfazer). */
export function presentes(s: ChamadaState): string[] {
  return [...s.present].reverse();
}

export function markPresent(s: ChamadaState, id: string): ChamadaState {
  if (s.present.includes(id)) return s;
  return { ...s, present: [...s.present, id] };
}

/** Desfazer: volta para "Faltam", na posição original da lista. */
export function unmark(s: ChamadaState, id: string): ChamadaState {
  if (!s.present.includes(id)) return s;
  return { ...s, present: s.present.filter((x) => x !== id) };
}

/** Novo visitante durante a chamada: entra na lista e já como presente. */
export function addAndMark(s: ChamadaState, id: string): ChamadaState {
  return { roster: s.roster.includes(id) ? s.roster : [...s.roster, id], present: s.present.includes(id) ? s.present : [...s.present, id] };
}
