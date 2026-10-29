import i18n from '@/i18n';

import { buildResultSheetModel } from './feedbackView';
import type { LessonExerciseItem } from './store';

const SELECT: LessonExerciseItem = {
  id: 'select',
  type: 'select_translation',
  prompt_ru: 'Выберите перевод',
  prompt: 'buenas tardes',
  options: ['добрий день', 'привіт'],
  answer: 'добрий день',
  phraseEs: 'buenas tardes',
  phraseTr: 'добрий день',
  itemIds: ['hola.buenas_tardes'],
  audio: 'items/a1/hola/buenas-tardes.es.normal.m4a',
};

const PAIRS: LessonExerciseItem = {
  id: 'pairs',
  type: 'match_pairs',
  prompt_ru: 'Соедините пары',
  pairs: [
    { left: 'buenas tardes', right: 'добрий день' },
    { left: 'hola', right: 'привіт' },
  ],
  answer: 'buenas tardes::добрий день|hola::привіт',
  phraseEs: 'buenas tardes. hola',
  phraseTr: 'добрий день. привіт',
  itemIds: ['hola.buenas_tardes', 'hola.hola'],
};

describe('buildResultSheetModel', () => {
  afterEach(async () => {
    await i18n.changeLanguage('ru');
  });

  it.each([
    ['ru', 'Правильно!', 'Есть ошибки: 2', 'Правильно:', 'Верно!'],
    ['uk', 'Правильно!', 'Є помилки: 2', 'Правильно:', 'Правильно!'],
    ['en', 'All matched!', 'Mistakes: 2', 'Correct:', 'Correct!'],
  ] as const)(
    'shows a translation in %s and never the internal answer',
    async (language, matched, mistakes, correctLabel, correctTitle) => {
      await i18n.changeLanguage(language);

      const right = buildResultSheetModel({
        t: i18n.t,
        exercise: SELECT,
        grade: { status: 'correct', correctAnswer: SELECT.answer },
        failed: false,
      });
      expect(right.title).toBe(correctTitle);
      expect(right.phraseEs).toBe('buenas tardes');
      expect(right.phraseTr).toBe('добрий день');
      expect(right.correctLabel).toBeUndefined();
      expect(right.autoPlay).toBe(true);
      expect(right.phraseEs).not.toContain('::');

      const wrong = buildResultSheetModel({
        t: i18n.t,
        exercise: SELECT,
        grade: { status: 'wrong', correctAnswer: SELECT.answer },
        failed: false,
      });
      expect(wrong.correctLabel).toBe(correctLabel);
      expect(wrong.phraseEs).toBe('buenas tardes');
      expect(wrong.phraseTr).toBe('добрий день');
      expect(wrong.autoPlay).toBe(false);

      const pairs = buildResultSheetModel({
        t: i18n.t,
        exercise: PAIRS,
        grade: {
          status: 'wrong',
          correctAnswer: PAIRS.answer,
          mistakes: 2,
          wrongKeys: ['hola'],
        },
        failed: false,
      });
      expect(pairs.title).toBe(mistakes);
      expect(pairs.pairs?.map((line) => line.text).join('\n')).toBe(
        'buenas tardes — добрий день\nhola — привіт ✗',
      );
      expect(pairs.pairs?.some((line) => line.text.includes('::'))).toBe(false);
      expect(pairs.speakText).not.toContain('hola.hola');

      const clear = buildResultSheetModel({
        t: i18n.t,
        exercise: PAIRS,
        grade: { status: 'correct', correctAnswer: PAIRS.answer, mistakes: 0, wrongKeys: [] },
        failed: false,
      });
      expect(clear.title).toBe(matched);
      expect(clear.autoPlay).toBe(true);
    },
  );
});
