import { itemsPracticed } from '@/features/review/sources';

import { courseLexicon, exerciseReference } from './reviewSources';
import type { LessonExerciseItem } from './store';

const hola: LessonExerciseItem = {
  id: 'e0',
  type: 'select_translation',
  prompt_ru: 'Выберите перевод',
  prompt: 'hola',
  options: ['привет', 'спасибо'],
  answer: 'привет',
};

const gracias: LessonExerciseItem = {
  id: 'e1',
  type: 'type_translation',
  prompt_ru: 'Напишите по-испански',
  prompt: 'спасибо',
  direction: 'ru_to_es',
  answer: 'gracias',
};

describe('course vocabulary', () => {
  it('links a bundled exercise to the card direction it practices', () => {
    const lexicon = courseLexicon();

    expect(itemsPracticed(exerciseReference(hola), lexicon)).toEqual([
      { itemId: 'hola.hola', direction: 'es_to_ru' },
    ]);
    expect(itemsPracticed(exerciseReference(gracias), lexicon)).toEqual([
      { itemId: 'hola.gracias', direction: 'ru_to_es' },
    ]);
  });
});
