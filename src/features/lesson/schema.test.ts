import { LessonSchema, parseLesson, safeParseLesson } from './schema';

describe('LessonSchema', () => {
  it('parses a minimal valid lesson', () => {
    const lesson = parseLesson({
      id: 'test-l01',
      level: 'A1',
      unit: 1,
      title_ru: 'Тест',
      draft: true,
      new_items: [],
      exercises: [
        {
          type: 'select_translation',
          prompt_ru: 'Выберите перевод',
          prompt: 'hola',
          options: ['привет', 'пока'],
          answer: 'привет',
        },
      ],
    });

    expect(lesson.id).toBe('test-l01');
    expect(lesson.draft).toBe(true);
    expect(lesson.exercises).toHaveLength(1);
  });

  it('rejects an unknown exercise type', () => {
    const result = safeParseLesson({
      id: 'bad',
      level: 'A1',
      unit: 1,
      title_ru: 'Плохой',
      exercises: [{ type: 'unknown_type', prompt_ru: 'x' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects fill_gap without ___ marker', () => {
    const result = LessonSchema.safeParse({
      id: 'bad-gap',
      level: 'A1',
      unit: 1,
      title_ru: 'Пробел',
      exercises: [
        {
          type: 'fill_gap',
          prompt_ru: 'Вставьте',
          sentence_es: 'Yo soy Juan',
          answer: 'soy',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
