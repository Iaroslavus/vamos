import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';

import { useSpeechCapture } from './useSpeechCapture';
import { SPEECH_MAX_ATTEMPTS } from '../options';
import {
  isSpeechPass,
  matchSpokenOption,
  scoreSpeech,
  speechWords,
  type SpeechOption,
  type SpeechScore,
} from '../score';

export type SpeakPracticeMode = 'step' | 'practice' | 'dialog';

const NO_OPTIONS: readonly SpeechOption[] = [];

type UseSpeakPracticeInput = {
  phrase: string;
  mode: SpeakPracticeMode;
  options?: readonly SpeechOption[];
  onMatch?: (optionId: string) => void;
  /** Dialog keeps the try count above the sheet, so closing it does not reset the cap. */
  attemptsUsed?: number;
  onAttemptsUsed?: (count: number) => void;
};

/**
 * Scores one spoken attempt against a reference phrase, or matches a dialog line.
 * Never reads or writes the lesson store: practice misses do not spend hearts.
 */
export function useSpeakPractice({
  phrase,
  mode,
  options = NO_OPTIONS,
  onMatch,
  attemptsUsed,
  onAttemptsUsed,
}: UseSpeakPracticeInput) {
  const [localAttempts, setLocalAttempts] = useState(0);
  const [scored, setScored] = useState<SpeechScore | null>(null);
  const [dialogMiss, setDialogMiss] = useState(false);
  const onMatchRef = useRef(onMatch);
  const optionsRef = useRef(options);
  const attemptsRef = useRef(attemptsUsed ?? 0);
  const onAttemptsUsedRef = useRef(onAttemptsUsed);
  const phraseRef = useRef(phrase);

  const attempts = attemptsUsed ?? localAttempts;

  useEffect(() => {
    onMatchRef.current = onMatch;
    optionsRef.current = options;
    onAttemptsUsedRef.current = onAttemptsUsed;
  }, [onAttemptsUsed, onMatch, options]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  useEffect(() => {
    if (phraseRef.current === phrase) return;
    phraseRef.current = phrase;
    setScored(null);
    setLocalAttempts(0);
    setDialogMiss(false);
  }, [phrase]);

  const hints = useMemo(
    () =>
      mode === 'dialog' ? options.map((option) => option.es) : [phrase, ...speechWords(phrase)],
    [mode, options, phrase],
  );

  const onFinal = useCallback(
    (text: string) => {
      const nextCount = Math.min(SPEECH_MAX_ATTEMPTS, attemptsRef.current + 1);
      attemptsRef.current = nextCount;
      if (onAttemptsUsedRef.current) onAttemptsUsedRef.current(nextCount);
      else setLocalAttempts(nextCount);

      if (mode === 'dialog') {
        const match = matchSpokenOption(text, optionsRef.current);
        if (match) {
          setDialogMiss(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onMatchRef.current?.(match.id);
          return;
        }
        setDialogMiss(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const next = scoreSpeech(phrase, text);
      setScored(next);
      void Haptics.notificationAsync(
        isSpeechPass(next)
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    },
    [mode, phrase],
  );

  const capture = useSpeechCapture(hints, onFinal);
  const shown =
    mode === 'dialog' || phrase.length === 0
      ? null
      : capture.transcript
        ? scoreSpeech(phrase, capture.transcript)
        : scored;
  const passed = mode !== 'dialog' && scored !== null && isSpeechPass(scored);
  const locked = mode !== 'practice' && attempts >= SPEECH_MAX_ATTEMPTS;
  const micBlocked = capture.access === 'blocked' || capture.access === 'unavailable';

  const onMic = () => {
    if (capture.listening) {
      capture.stop();
      return;
    }
    if (locked || micBlocked) return;
    setDialogMiss(false);
    void capture.begin();
  };

  const { begin, stop } = capture;

  useEffect(() => {
    if (mode !== 'dialog') return;
    let cancelled = false;
    void stopLessonAudio();
    void begin().then(() => {
      if (cancelled) stop();
    });
    return () => {
      cancelled = true;
    };
  }, [begin, mode, stop]);

  return {
    capture,
    shown,
    passed,
    locked,
    micBlocked,
    dialogMiss,
    attemptsLeft: Math.max(0, SPEECH_MAX_ATTEMPTS - attempts),
    onMic,
  };
}
