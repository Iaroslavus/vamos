import type { Item } from '@/features/content/schema';

import {
  advanceNpc,
  advanceSend,
  chooseDialogOption,
  createDialogState,
  dialogResult,
  endDialog,
  resolveDialogLines,
  type PlayableDialogLine,
} from './dialog';

function item(id: string, es: string, ru: string): Item {
  return {
    id,
    type: 'phrase',
    es,
    ru,
    parts: [],
    say_ru: 'sa',
    note_ru: null,
    why_ru: null,
    level: 'A1',
    variant: 'both',
    audio: { es: `${id}.mp3`, latam: null },
    tags: [],
    draft: false,
  };
}

const items = new Map<string, Item>([
  ['hola.buenos_dias', item('hola.buenos_dias', 'buenos días', 'доброе утро')],
  ['hola.gracias', item('hola.gracias', 'gracias', 'спасибо')],
  ['hola.adios', item('hola.adios', 'adiós', 'пока')],
]);

const lines: PlayableDialogLine[] = resolveDialogLines(
  [
    { who: 'npc', es: '¡Hola!', ru: 'Привет!' },
    {
      who: 'user',
      target: 'hola.buenos_dias',
      options: ['hola.buenos_dias', 'hola.gracias', 'hola.adios'],
    },
    { who: 'npc', es: '¿Un café?', ru: 'Кофе?' },
  ],
  items,
);

describe('dialog lines', () => {
  it('resolves option text and the preferred audio', () => {
    const user = lines[1];
    expect(user).toMatchObject({
      who: 'user',
      es: 'buenos días',
      ru: 'доброе утро',
      audio: 'hola.buenos_dias.mp3',
    });
    if (user?.who !== 'user') return;
    expect(user.options.map((option) => option.es)).toEqual(['buenos días', 'gracias', 'adiós']);
  });

  it('refuses an option that is not in the library', () => {
    expect(() =>
      resolveDialogLines(
        [{ who: 'user', target: 'missing', options: ['missing', 'hola.gracias'] }],
        items,
      ),
    ).toThrow(/Unknown dialog item: missing/);
  });
});

describe('dialog turns', () => {
  it('opens on the npc line, then the choices', () => {
    const started = createDialogState(lines);
    expect(started.phase).toBe('listen');
    expect(started.visibleCount).toBe(1);

    const choosing = advanceNpc(started);
    expect(choosing.phase).toBe('choose');
    expect(choosing.index).toBe(1);
    expect(choosing.visibleCount).toBe(1);
  });

  it('sends a first-try hit without a miss', () => {
    const choosing = advanceNpc(createDialogState(lines));
    const sent = chooseDialogOption(choosing, 'hola.buenos_dias');

    expect(sent.phase).toBe('send');
    expect(sent.visibleCount).toBe(2);
    expect(sent.sendingEs).toBe('buenos días');
    expect(sent.sendingRevealed).toBe(false);
    expect(sent.outcomes).toEqual([
      expect.objectContaining({ itemId: 'hola.buenos_dias', missed: false }),
    ]);

    const next = advanceSend(sent);
    expect(next.phase).toBe('listen');
    expect(next.visibleCount).toBe(3);
    expect(advanceNpc(next).phase).toBe('done');
  });

  it('shakes and hints on a miss, then sends the second chance as a miss', () => {
    const choosing = advanceNpc(createDialogState(lines));
    const hinted = chooseDialogOption(choosing, 'hola.gracias');

    expect(hinted.phase).toBe('choose');
    expect(hinted.attempt).toBe(2);
    expect(hinted.hint).toBe('доброе утро');
    expect(hinted.shake).toBe(1);
    expect(hinted.rejectedIds).toEqual(['hola.gracias']);
    expect(hinted.outcomes).toEqual([]);
    expect(chooseDialogOption(hinted, 'hola.gracias')).toBe(hinted);

    const sent = chooseDialogOption(hinted, 'hola.buenos_dias');
    expect(sent.phase).toBe('send');
    expect(sent.sendingRevealed).toBe(false);
    expect(sent.outcomes[0]).toMatchObject({ missed: true, es: 'buenos días' });
  });

  it('reveals the correct line when the second chance misses too', () => {
    let state = advanceNpc(createDialogState(lines));
    state = chooseDialogOption(state, 'hola.gracias');
    state = chooseDialogOption(state, 'hola.adios');

    expect(state.phase).toBe('send');
    expect(state.sendingRevealed).toBe(true);
    expect(state.sendingEs).toBe('buenos días');
    expect(state.visibleCount).toBe(2);
    expect(dialogResult('s9', state).missedItemIds).toEqual(['hola.buenos_dias']);
  });

  it('does not reveal later lines when the dialog is cut short', () => {
    const choosing = advanceNpc(createDialogState(lines));
    const stopped = endDialog(choosing);
    expect(stopped.phase).toBe('done');
    expect(stopped.visibleCount).toBe(1);
  });

  it('ignores a tap that is not one of the options', () => {
    const choosing = advanceNpc(createDialogState(lines));
    expect(chooseDialogOption(choosing, 'other')).toBe(choosing);
    const listening = createDialogState(lines);
    expect(chooseDialogOption(listening, 'hola.gracias')).toBe(listening);
  });
});
