import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import { AudioControls } from '@/features/audio/AudioControls';
import { contentLanguage } from '@/features/content/language';
import { getItem } from '@/features/content/loader';
import { textOf } from '@/features/content/text';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { LessonExerciseBody } from '@/features/lesson/components/LessonExerciseBody';
import { SpeakRepeatStep } from '@/features/lesson/components/SpeakRepeatStep';
import type { GradeStatus } from '@/features/lesson/grading';
import type { MatchPairsOutcome } from '@/features/lesson/hooks/useMatchPairs';
import { space } from '@/theme/tokens';

import { studyStepExercise } from '../exercise';
import type { StudyStep } from '../types';

type StudyStepBodyProps = {
  step: StudyStep;
  prompt: string;
  answer: string;
  disabled: boolean;
  gradeStatus: GradeStatus | null;
  inputRef: RefObject<AnswerTextFieldHandle | null>;
  onAnswer: (value: string) => void;
  onMatchSolved: (outcome: MatchPairsOutcome) => void;
  onSpeakPass: () => void;
  onSpeakSkip: () => void;
};

export function StudyStepBody({
  step,
  prompt,
  answer,
  disabled,
  gradeStatus,
  inputRef,
  onAnswer,
  onMatchSolved,
  onSpeakPass,
  onSpeakSkip,
}: StudyStepBodyProps) {
  if (step.type === 'speak_repeat') {
    const extras = speakExtras(step.itemId);
    return (
      <SpeakRepeatStep
        promptEs={step.promptEs}
        audio={step.audio}
        sayRu={extras.sayRu}
        parts={extras.parts}
        confusables={extras.confusables}
        featuresPath={extras.featuresPath}
        onSkip={onSpeakSkip}
        onContinue={onSpeakPass}
      />
    );
  }

  const exercise = studyStepExercise(step, prompt);
  if (!exercise) return null;

  return (
    <View style={styles.stack}>
      {step.type === 'type_translation' && step.playEs ? (
        <AudioControls text={step.phraseEs} audio={step.audio} />
      ) : null}
      <LessonExerciseBody
        exercise={exercise}
        userAnswer={answer}
        disabled={disabled}
        gradeStatus={gradeStatus}
        onSelect={onAnswer}
        onAnswerChange={onAnswer}
        onMatchSolved={onMatchSolved}
        inputRef={inputRef}
      />
    </View>
  );
}

function speakExtras(itemId: string): {
  sayRu: string | null;
  parts: { es: string; ru: string }[];
  confusables: string[];
  featuresPath: string | null;
} {
  try {
    const item = getItem(itemId);
    const say = textOf(item.say, contentLanguage());
    return {
      sayRu: say || null,
      parts: item.parts.map((part) => ({ es: part.es, ru: textOf(part.tr, contentLanguage()) })),
      confusables: [...item.confusables],
      featuresPath: item.audio.features,
    };
  } catch {
    return { sayRu: null, parts: [], confusables: [], featuresPath: null };
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: space.lg,
  },
});
