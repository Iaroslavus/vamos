import { serializePairs } from '@/features/lesson/pairs';
import type { LessonExerciseItem } from '@/features/lesson/store';

import type { StudyExerciseStep, StudyStep } from './types';

export function isGradedStep(step: StudyStep): step is StudyExerciseStep {
  return (
    step.type === 'select_translation' ||
    step.type === 'listen_select' ||
    step.type === 'type_translation'
  );
}

/** Lesson exercise payload for a planned step. Speak and flashcards stay on their own screens. */
export function studyStepExercise(step: StudyStep, promptRu: string): LessonExerciseItem | null {
  if (step.type === 'speak_repeat' || step.type === 'flashcard') return null;

  if (step.type === 'match_pairs') {
    const pairs = step.pairs.map((pair) => ({ left: pair.left, right: pair.right }));
    return {
      id: step.id,
      type: 'match_pairs',
      prompt_ru: promptRu,
      pairs,
      answer: serializePairs(pairs),
      phraseEs: step.pairs.map((pair) => pair.es).join('. '),
      phraseTr: step.pairs.map((pair) => pair.tr).join('. '),
      itemIds: step.itemIds,
      audio: null,
    };
  }

  const shared = {
    id: step.id,
    prompt_ru: promptRu,
    answer: step.answer,
    phraseEs: step.phraseEs,
    phraseTr: step.phraseTr,
    itemIds: [step.itemId],
    audio: step.audio,
  };

  if (step.type === 'listen_select') {
    return {
      ...shared,
      type: 'listen_select',
      options: step.options,
      speakText: step.phraseEs,
      itemId: step.itemId,
    };
  }

  if (step.type === 'type_translation') {
    return {
      ...shared,
      type: 'type_translation',
      prompt: step.prompt,
      direction: step.direction,
    };
  }

  return {
    ...shared,
    type: 'select_translation',
    prompt: step.prompt,
    options: step.options,
  };
}
