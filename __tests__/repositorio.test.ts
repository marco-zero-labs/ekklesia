import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { LocalRepository } from '../src/data/local';
import { todayDay, addDays } from '../src/lib/dates';

describe('repositório local', () => {
  let repo: LocalRepository;
  beforeEach(async () => {
    repo = new LocalRepository();
    await repo.resetSample();
  });

  test('registrar contato salva, audita e pode ser desfeito', async () => {
    const before = await repo.getPerson('v-lucas');
    const { stageChanged, undo } = await repo.registerContact('v-lucas', { type: 'whatsapp', result: 'conversou', nextContact: addDays(todayDay(), 7) }, 'p-anapaula');
    expect(stageChanged).toBe('contato_feito');
    const after = await repo.getPerson('v-lucas');
    expect(after!.followUp!.contacts.length).toBe(before!.followUp!.contacts.length + 1);
    const audit = await repo.listAudit();
    expect(audit[0]).toMatchObject({ action: 'Registrou contato', target: 'Lucas Ferreira', actorId: 'p-anapaula' });
    await undo();
    expect((await repo.getPerson('v-lucas'))!.followUp!.stage).toBe('primeira_visita');
  });

  test('ficha pública entra na fila como Primeira visita', async () => {
    const { id } = await repo.submitFicha({ name: 'Rosângela Pires de Melo', phone: '(81) 99247-3315', howFound: 'Fui convidado' });
    const p = await repo.getPerson(id);
    expect(p!.followUp!.stage).toBe('primeira_visita');
    expect(p!.followUp!.nextContact).toBe(todayDay());
    expect(p!.consent.status).toBe('dado');
  });

  test('resposta pelo link aparece na escala do líder', async () => {
    const schedules = await repo.listSchedules();
    const louvor = schedules.find((s) => s.id === 'esc-louvor-noite')!;
    const bateria = louvor.slots.find((s) => s.role === 'Bateria')!;
    await repo.assignSlot(louvor.id, bateria.id, 'p-daniel', 'p-carla');
    const slot = (await repo.listSchedules()).find((s) => s.id === louvor.id)!.slots.find((s) => s.role === 'Bateria')!;
    expect(slot).toMatchObject({ personId: 'p-daniel', status: 'aguardando' });
    await repo.respondSlot(slot.id, 'recusou', 'No dia 29 eu posso.');
    const done = (await repo.listSchedules()).find((s) => s.id === louvor.id)!.slots.find((s) => s.id === slot.id)!;
    expect(done).toMatchObject({ status: 'recusou', message: 'No dia 29 eu posso.' });
  });

  test('modo de demonstração com erro', async () => {
    await repo.setDemo({ slow: false, fail: true });
    await expect(repo.listPeople()).rejects.toThrow('Simulação de falha');
    await repo.setDemo({ slow: false, fail: false });
    await expect(repo.listPeople()).resolves.toHaveLength(538);
  });
});
