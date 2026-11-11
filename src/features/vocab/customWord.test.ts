import type { StoredCard } from '@/features/review/types';
import { glossItem } from '@/features/study/gloss';
import { buildStudyUnits, sessionPlan } from '@/features/study/sessionPlan';
import { DEFAULT_STUDY_SETTINGS } from '@/features/study/types';

import { deleteCustomWord, parseCustomWord, saveCustomWord, updateCustomWord } from './customWord';
import type { UserItem } from './types';

const WORD: UserItem = {
  id: '11111111-1111-4111-8111-111111111111',
  es: 'gato',
  tr: 'кіт',
  note: null,
  createdAt: '2026-11-11T12:00:00.000Z',
};

function card(itemId: string): StoredCard {
  return {
    id: 'card-1',
    itemId,
    direction: 'es_to_ru',
    due: '2026-11-11T12:00:00.000Z',
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastReview: null,
  };
}

describe('parseCustomWord', () => {
  it('trims the fields and keeps an empty note empty', () => {
    expect(parseCustomWord({ es: '  gato ', tr: ' кіт ', note: '   ' }, [])).toEqual({
      ok: true,
      value: { es: 'gato', tr: 'кіт', note: null },
    });
  });

  it('rejects a blank Spanish line before a blank translation', () => {
    expect(parseCustomWord({ es: '  ', tr: '', note: '' }, []).ok).toBe(false);
    expect(parseCustomWord({ es: '  ', tr: '', note: '' }, [])).toMatchObject({
      issue: 'empty-es',
    });
    expect(parseCustomWord({ es: 'gato', tr: '  ', note: 'дом' }, [])).toMatchObject({
      issue: 'empty-tr',
    });
  });

  it('rejects the same Spanish line, ignoring case and accents', () => {
    expect(parseCustomWord({ es: 'Gató', tr: 'кошка', note: '' }, [WORD])).toMatchObject({
      issue: 'duplicate',
    });
    expect(parseCustomWord({ es: 'Gató', tr: 'кошка', note: '' }, [WORD], WORD.id)).toMatchObject({
      ok: true,
    });
  });

  it('rejects a line that does not fit the column', () => {
    expect(parseCustomWord({ es: 'a'.repeat(81), tr: 'кіт', note: '' }, [])).toMatchObject({
      issue: 'too-long',
    });
  });
});

describe('custom words in study and review', () => {
  it('saves the word and opens a recognition card', async () => {
    const addUserItem = jest.fn(async () => ({
      snapshot: { folders: [], items: [], userItems: [WORD], pending: 1 },
      item: WORD,
    }));
    const introduceItems = jest.fn(async () => ({
      cards: [card(WORD.id)],
      logs: [],
      dueCount: 1,
      pending: 1,
    }));

    const saved = await saveCustomWord(
      { addUserItem, updateUserItem: jest.fn(), deleteUserItem: jest.fn() },
      { introduceItems },
      'user-1',
      'folder-1',
      { es: ' gato ', tr: ' кіт ', note: '  ' },
      [],
    );

    expect(saved.id).toBe(WORD.id);
    expect(addUserItem).toHaveBeenCalledWith('user-1', 'folder-1', {
      es: 'gato',
      tr: 'кіт',
      note: null,
    });
    expect(introduceItems).toHaveBeenCalledWith('user-1', [{ id: WORD.id }]);
  });

  it('does not open a card when the word is a duplicate', async () => {
    const addUserItem = jest.fn();
    const introduceItems = jest.fn();
    await expect(
      saveCustomWord(
        { addUserItem, updateUserItem: jest.fn(), deleteUserItem: jest.fn() },
        { introduceItems },
        'user-1',
        'folder-1',
        { es: 'gato', tr: 'кіт', note: '' },
        [WORD],
      ),
    ).rejects.toThrow('duplicate');
    expect(addUserItem).not.toHaveBeenCalled();
    expect(introduceItems).not.toHaveBeenCalled();
  });

  it('updates the gloss and deletes the word together with its cards', async () => {
    const updateUserItem = jest.fn(async () => ({
      folders: [],
      items: [],
      userItems: [],
      pending: 1,
    }));
    await updateCustomWord(
      { addUserItem: jest.fn(), updateUserItem, deleteUserItem: jest.fn() },
      'user-1',
      WORD.id,
      { es: 'gata', tr: 'кішка', note: 'дом' },
      [WORD],
    );
    expect(updateUserItem).toHaveBeenCalledWith('user-1', WORD.id, {
      es: 'gata',
      tr: 'кішка',
      note: 'дом',
    });

    const deleteUserItem = jest.fn(async () => ({
      folders: [],
      items: [],
      userItems: [],
      pending: 1,
    }));
    const forgetItems = jest.fn(async () => ({ cards: [], logs: [], dueCount: 0, pending: 1 }));
    await deleteCustomWord(
      { addUserItem: jest.fn(), updateUserItem: jest.fn(), deleteUserItem },
      { forgetItems },
      'user-1',
      WORD.id,
    );
    expect(deleteUserItem).toHaveBeenCalledWith('user-1', WORD.id);
    expect(forgetItems).toHaveBeenCalledWith('user-1', [WORD.id]);
  });

  it('studies and repeats a custom word the same way as a course phrase', () => {
    expect(glossItem(WORD.id, 'uk', [WORD])).toEqual({ es: 'gato', tr: 'кіт', audio: null });
    const units = buildStudyUnits({
      itemIds: [WORD.id],
      cards: [card(WORD.id)],
      now: new Date('2026-11-11T12:00:00.000Z'),
      gloss: (id) => glossItem(id, 'uk', [WORD]),
    });
    expect(units[0]).toMatchObject({ introduced: true, es: 'gato', tr: 'кіт', audio: null });
    expect(sessionPlan('flashcards', units, DEFAULT_STUDY_SETTINGS)).toHaveLength(1);
    expect(sessionPlan('learn', units, DEFAULT_STUDY_SETTINGS).length).toBeGreaterThan(0);
    expect(sessionPlan('speak', units, DEFAULT_STUDY_SETTINGS)).toHaveLength(1);
    expect(sessionPlan('blitz', units, DEFAULT_STUDY_SETTINGS)).toHaveLength(1);

    const fresh = buildStudyUnits({
      itemIds: [WORD.id],
      cards: [],
      now: new Date('2026-11-11T12:00:00.000Z'),
      gloss: (id) => glossItem(id, 'uk', [WORD]),
    });
    expect(sessionPlan('flashcards', fresh, DEFAULT_STUDY_SETTINGS)).toEqual([]);
  });
});
