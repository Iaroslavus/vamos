import { act, renderHook } from '@testing-library/react-native';

import { DEFAULT_STUDY_SETTINGS, type StudyUnit } from '../types';
import { useLearnSession } from './useLearnSession';

jest.mock('@/features/audio/playback', () => ({
  stopLessonAudio: jest.fn(async () => undefined),
}));

function word(id: string, es: string, tr: string): StudyUnit {
  return {
    id,
    es,
    tr,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  };
}

const hola = word('hola', 'hola', 'привет');
const adios = word('adios', 'adiós', 'пока');

async function submit(result: { current: ReturnType<typeof useLearnSession> }, text: string) {
  await act(async () => {
    result.current.setAnswer(text);
  });
  await act(async () => {
    result.current.check();
  });
  await act(async () => {
    await result.current.goOn();
  });
}

describe('useLearnSession', () => {
  it('rates a clean unit Good and a unit with a miss Hard', async () => {
    const onRecord = jest.fn(async () => undefined);
    const { result } = await renderHook(() =>
      useLearnSession({
        units: [hola, adios],
        settings: DEFAULT_STUDY_SETTINGS,
        mic: false,
        onRecord,
      }),
    );

    const first = result.current.step;
    if (!first || !('answer' in first)) throw new Error('missing first prompt');
    await submit(result, 'нет');

    let guard = 0;
    while (result.current.phase === 'quiz' && guard < 40) {
      const step = result.current.step;
      if (!step || !('answer' in step)) throw new Error('missing prompt');
      await submit(result, step.answer);
      guard += 1;
    }

    expect(result.current.phase).toBe('done');
    expect(result.current.tally).toEqual({ learned: 2, total: 2, misses: 1 });
    expect(onRecord).toHaveBeenCalledTimes(2);
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'hola',
        grade: 'correct_after_error',
        direction: 'es_to_ru',
      }),
    );
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'adios', grade: 'correct_first', direction: 'es_to_ru' }),
    );
  });

  it('counts a missing accent as correct and keeps the Good rating', async () => {
    const onRecord = jest.fn(async () => undefined);
    const { result } = await renderHook(() =>
      useLearnSession({
        units: [adios],
        settings: DEFAULT_STUDY_SETTINGS,
        mic: false,
        onRecord,
      }),
    );

    let typedReverse = false;
    let guard = 0;
    while (result.current.phase === 'quiz' && guard < 8) {
      const step = result.current.step;
      if (!step || !('answer' in step)) throw new Error('missing prompt');
      const almost = step.direction === 'ru_to_es' && !typedReverse;
      if (almost) typedReverse = true;
      await submit(result, almost ? 'adios' : step.answer);
      guard += 1;
    }

    expect(typedReverse).toBe(true);
    expect(result.current.phase).toBe('done');
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'adios', grade: 'correct_first' }),
    );
  });

  it('does not advance when the rating fails to save', async () => {
    const onRecord = jest.fn(async () => {
      throw new Error('offline');
    });
    const { result } = await renderHook(() =>
      useLearnSession({
        units: [hola],
        settings: DEFAULT_STUDY_SETTINGS,
        mic: false,
        onRecord,
      }),
    );

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const step = result.current.step;
      if (!step || !('answer' in step)) throw new Error('missing prompt');
      await submit(result, step.answer);
    }

    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('quiz');
    expect(result.current.rateError).toBe(true);

    onRecord.mockResolvedValue(undefined);
    await act(async () => {
      await result.current.goOn();
    });
    expect(result.current.phase).toBe('done');
    expect(onRecord).toHaveBeenCalledTimes(2);
  });
});
