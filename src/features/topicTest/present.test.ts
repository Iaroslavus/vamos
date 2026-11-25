import { ItemSchema } from '@/features/content/schema';

import { assembleTopicTest } from './assemble';
import { personalizeTask } from './present';

describe('personalizeTask', () => {
  it('fills the learner name into the prompt and the expected answer', () => {
    const phrase = ItemSchema.parse({
      id: 'me',
      type: 'phrase',
      es: 'Me llamo {name}',
      tr: { ru: 'Меня зовут {name}', uk: 'Мене звати {name}', en: 'My name is {name}' },
      say: { ru: 'say', uk: 'say', en: 'say' },
      level: 'A1',
      parts: [
        { es: 'Me', tr: { ru: 'Me', uk: 'Me', en: 'Me' } },
        { es: 'llamo', tr: { ru: 'llamo', uk: 'llamo', en: 'llamo' } },
        { es: '{name}', tr: { ru: '{name}', uk: '{name}', en: '{name}' } },
      ],
    });
    const tasks = assembleTopicTest({
      lessons: [{ id: 'l1', items: [phrase] }],
      seed: 'name',
      language: 'uk',
    });
    const recall = tasks.find((task) => task.kind === 'recall');
    expect(recall?.step.type).toBe('type_translation');
    if (!recall || recall.step.type !== 'type_translation') return;
    const named = personalizeTask(recall, 'Анна');
    if (named.step.type !== 'type_translation') return;
    expect(named.step.prompt).toBe('Мене звати Анна');
    expect(named.step.answer).toBe('Me llamo Анна');
  });
});
