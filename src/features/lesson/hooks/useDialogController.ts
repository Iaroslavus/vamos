import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { playGradeSound } from '@/features/audio/sounds';
import type { Item } from '@/features/content/schema';

import {
  advanceNpc,
  advanceSend,
  chooseDialogOption,
  createDialogState,
  dialogResult,
  endDialog,
  indexDialogItems,
  resolveDialogLines,
  type DialogStepResult,
} from '../dialog';
import type { DialogStep as DialogStepData } from '../generator';
import type { AudioPreference } from '../intro';
import { useLessonStore } from '../store';

/** If speech never reports the end, still move the chat forward. */
const AUDIO_FALLBACK_MS = 12_000;

type UseDialogControllerInput = {
  step: DialogStepData;
  items: readonly Item[];
  audioVariant: AudioPreference;
  onComplete?: (result: DialogStepResult) => void;
};

export function useDialogController({
  step,
  items,
  audioVariant,
  onComplete,
}: UseDialogControllerInput) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const recordDialogLine = useLessonStore((state) => state.recordDialogLine);
  const promptRu = t('lesson.dialogRetryPrompt');
  const playable = useMemo(
    () => resolveDialogLines(step.lines, indexDialogItems(items), audioVariant, language),
    [audioVariant, items, language, step.lines],
  );
  const [state, setState] = useState(() => createDialogState(playable));
  const blocked = useRef(false);
  const completed = useRef(false);
  const advanceRef = useRef<() => void>(() => {});

  if (state.lines !== playable) {
    setState(createDialogState(playable));
  }

  useEffect(() => {
    blocked.current = false;
    completed.current = false;
  }, [playable]);

  useEffect(() => {
    return () => {
      void stopLessonAudio();
    };
  }, []);

  useEffect(() => {
    if (state.lines !== playable || state.phase !== 'done' || completed.current) return;
    completed.current = true;
    onComplete?.(dialogResult(step.id, state));
  }, [onComplete, playable, state, step.id]);

  useEffect(() => {
    if (state.phase !== 'listen' && state.phase !== 'send') {
      advanceRef.current = () => {};
      return;
    }

    const index = state.index;
    const phase = state.phase;
    const line = state.lines[index];
    const text = phase === 'send' ? (state.sendingEs ?? '') : line?.who === 'npc' ? line.es : '';
    const audio = phase === 'send' ? state.sendingAudio : null;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      setState((current) => {
        if (current.index !== index || current.phase !== phase) return current;
        if (phase === 'listen') return advanceNpc(current);
        if (blocked.current) return endDialog(current);
        return advanceSend(current);
      });
    };

    advanceRef.current = finish;
    timer = setTimeout(finish, AUDIO_FALLBACK_MS);
    if (text) {
      void playLessonAudio({ text, audio, onEnd: finish }).catch(() => {
        finish();
      });
    } else {
      finish();
    }

    return () => {
      settled = true;
      advanceRef.current = () => {};
      if (timer) clearTimeout(timer);
    };
  }, [state.index, state.lines, state.phase, state.sendingAudio, state.sendingEs]);

  const choose = (optionId: string) => {
    const next = chooseDialogOption(state, optionId);
    if (next === state) return;
    if (next.shake !== state.shake) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playGradeSound('wrong');
    }
    const outcome = next.outcomes[next.outcomes.length - 1];
    if (outcome && next.outcomes.length > state.outcomes.length) {
      if (next.sendingRevealed) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playGradeSound('wrong');
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const result = recordDialogLine({
        stepId: step.id,
        lineIndex: outcome.index,
        itemId: outcome.itemId,
        answer: outcome.es,
        options: outcome.options,
        prompt: outcome.ru,
        promptRu,
        missed: outcome.missed,
      });
      if (result.failed) blocked.current = true;
    }
    setState(next);
  };

  const replay = (index: number) => {
    const line = state.lines[index];
    if (!line || line.who !== 'npc') return;
    const currentCue = state.phase === 'listen' && state.index === index;
    void playLessonAudio({
      text: line.es,
      audio: null,
      onEnd: currentCue ? () => advanceRef.current() : undefined,
    });
  };

  return { state, choose, replay };
}
