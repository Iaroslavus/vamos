import { formatExerciseAnswer } from './answerFormat';
import type { LessonExerciseItem } from './store';

const PHRASE = {
  phraseEs: 'buenas tardes',
  phraseTr: 'добрий день',
  itemIds: ['hola.buenas_tardes'],
  audio: 'items/a1/hola/buenas-tardes.es.normal.m4a',
};

describe('formatExerciseAnswer', () => {
  it('formats every exercise as Spanish and a translation', () => {
    expect(formatExerciseAnswer(exercise('select_translation')).text).toMatchInlineSnapshot(
      `"buenas tardes — добрий день"`,
    );
    expect(formatExerciseAnswer(exercise('build_sentence')).text).toMatchInlineSnapshot(
      `"buenas tardes — добрий день"`,
    );
    expect(formatExerciseAnswer(exercise('listen_select')).text).toMatchInlineSnapshot(
      `"buenas tardes — добрий день"`,
    );
    expect(formatExerciseAnswer(exercise('type_translation')).text).toMatchInlineSnapshot(
      `"buenas tardes — добрий день"`,
    );
    expect(formatExerciseAnswer(exercise('fill_gap')).text).toMatchInlineSnapshot(
      `"buenas tardes — добрий день"`,
    );
    expect(formatExerciseAnswer(exercise('match_pairs')).text).toMatchInlineSnapshot(`
      "buenas tardes — добрий день
      hola — привіт"
    `);
  });

  it('marks pairs that were chosen wrong and hides the grading encoding', () => {
    const formatted = formatExerciseAnswer(exercise('match_pairs'), ['hola']);

    expect(formatted.text).toMatchInlineSnapshot(`
      "buenas tardes — добрий день
      hola — привіт ✗"
    `);
    expect(formatted.text).not.toContain('::');
    expect(formatted.text).not.toContain('|');
    expect(formatted.text).not.toContain('hola.buenas_tardes');
    expect(formatted.lines.find((line) => line.wrong)?.text).toContain('hola');
  });
});

function exercise(type: LessonExerciseItem['type']): LessonExerciseItem {
  switch (type) {
    case 'select_translation':
      return {
        id: 'select',
        type,
        prompt_ru: 'Выберите перевод',
        prompt: 'buenas tardes',
        options: ['добрий день', 'привіт'],
        answer: 'добрий день',
        ...PHRASE,
      };
    case 'build_sentence':
      return {
        id: 'build',
        type,
        prompt_ru: 'Составьте фразу',
        tiles: ['buenas', 'tardes'],
        answer: 'buenas tardes',
        ...PHRASE,
      };
    case 'listen_select':
      return {
        id: 'listen',
        type,
        prompt_ru: 'Что вы слышите?',
        options: ['добрий день', 'привіт'],
        answer: 'добрий день',
        speakText: 'buenas tardes',
        ...PHRASE,
      };
    case 'type_translation':
      return {
        id: 'type',
        type,
        prompt_ru: 'Напишите по-испански',
        prompt: 'добрий день',
        direction: 'ru_to_es',
        answer: 'buenas tardes',
        ...PHRASE,
      };
    case 'fill_gap':
      return {
        id: 'gap',
        type,
        prompt_ru: 'Вставьте слово',
        sentence_es: 'buenas ___',
        answer: 'tardes',
        ...PHRASE,
      };
    case 'match_pairs':
      return {
        id: 'pairs',
        type,
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
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
