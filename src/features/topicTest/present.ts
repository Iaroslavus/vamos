import { displayText } from '@/features/content/displayText';
import { fillName } from '@/features/content/gender';
import type { LessonExerciseItem } from '@/features/lesson/store';

import type { TopicTestTask } from './assemble';

/** `{name}` becomes the learner's name in prompts, tiles, and the expected answer. */
export function personalizeTask(task: TopicTestTask, name: string): TopicTestTask {
  const fill = (value: string) => fillName(value, name);
  const step = task.step;
  if (step.type === 'select_translation') {
    return {
      ...task,
      step: {
        ...step,
        prompt: fill(step.prompt),
        answer: fill(step.answer),
        options: step.options.map(fill),
      },
    };
  }
  if (step.type === 'listen_select') {
    return {
      ...task,
      step: {
        ...step,
        speakText: fill(step.speakText),
        answer: fill(step.answer),
        options: step.options.map(fill),
      },
    };
  }
  if (step.type === 'build_sentence') {
    return {
      ...task,
      step: {
        ...step,
        prompt_ru: fill(step.prompt_ru),
        answer: fill(step.answer),
        tiles: step.tiles.map(fill),
        ...(step.accepted ? { accepted: step.accepted.map(fill) } : {}),
      },
    };
  }
  if (step.type === 'type_translation') {
    return {
      ...task,
      step: { ...step, prompt: fill(step.prompt), answer: fill(step.answer) },
    };
  }
  return { ...task, step: { ...step, prompt_es: fill(step.prompt_es) } };
}

/** Lesson exercise body for a graded task. Speaking stays on its own step. */
export function exerciseOf(task: TopicTestTask): LessonExerciseItem | null {
  const step = task.step;
  if (step.type === 'select_translation') {
    return {
      id: task.id,
      type: 'select_translation',
      prompt_ru: step.prompt_ru,
      prompt: step.prompt,
      options: step.options,
      answer: step.answer,
      phraseEs: step.prompt,
      phraseTr: step.answer,
      itemIds: step.itemIds,
    };
  }
  if (step.type === 'build_sentence') {
    return {
      id: task.id,
      type: 'build_sentence',
      prompt_ru: step.prompt_ru,
      tiles: step.tiles,
      answer: step.answer,
      ...(step.accepted ? { accepted: step.accepted } : {}),
      phraseEs: step.answer,
      itemIds: step.itemIds,
    };
  }
  if (step.type === 'listen_select') {
    return {
      id: task.id,
      type: 'listen_select',
      prompt_ru: step.prompt_ru,
      options: step.options,
      answer: step.answer,
      speakText: step.speakText,
      ...(step.audio ? { audio: step.audio } : {}),
      ...(step.itemIds[0] ? { itemId: step.itemIds[0] } : {}),
      phraseEs: step.speakText,
      phraseTr: step.answer,
      itemIds: step.itemIds,
    };
  }
  if (step.type === 'type_translation') {
    return {
      id: task.id,
      type: 'type_translation',
      prompt_ru: step.prompt_ru,
      prompt: step.prompt,
      direction: step.direction,
      answer: step.answer,
      phraseEs: step.answer,
      phraseTr: step.prompt,
      itemIds: step.itemIds,
    };
  }
  return null;
}

export function feedbackAnswer(task: TopicTestTask, correctAnswer: string): string {
  return displayText(correctAnswer || taskAnswer(task));
}

function taskAnswer(task: TopicTestTask): string {
  const step = task.step;
  if (step.type === 'speak_repeat') return step.prompt_es;
  return step.answer;
}
