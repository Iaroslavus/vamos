import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';

import { useSpeechCapture, type SpeechFinal } from './useSpeechCapture';
import { SPEECH_MAX_ATTEMPTS } from '../options';
import { deleteSpeechFile } from '../recording';
import {
  isSpeechPass,
  matchSpokenOption,
  needsSelfCompare,
  scoreSpeech,
  type SpeechOption,
  type SpeechScore,
} from '../score';

export type SpeakPracticeMode = 'step' | 'practice' | 'dialog';

const NO_OPTIONS: readonly SpeechOption[] = [];
const NO_CONFUSABLES: readonly string[] = [];

type UseSpeakPracticeInput = {
  phrase: string;
  mode: SpeakPracticeMode;
  options?: readonly SpeechOption[];
  confusables?: readonly string[];
  onMatch?: (optionId: string) => void;
  /** Dialog keeps the try count above the sheet, so closing it does not reset the cap. */
  attemptsUsed?: number;
  onAttemptsUsed?: (count: number) => void;
};

/**
 * Scores one spoken attempt against a reference phrase, or matches a dialog line.
 * Never reads or writes the lesson store: practice misses do not spend hearts.
 * One- and two-word phrases wait for the learner to compare the take with the sample.
 */
export function useSpeakPractice({
  phrase,
  mode,
  options = NO_OPTIONS,
  confusables = NO_CONFUSABLES,
  onMatch,
  attemptsUsed,
  onAttemptsUsed,
}: UseSpeakPracticeInput) {
  const [localAttempts, setLocalAttempts] = useState(0);
  const [scored, setScored] = useState<SpeechScore | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [compareToken, setCompareToken] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [dialogMiss, setDialogMiss] = useState(false);
  const onMatchRef = useRef(onMatch);
  const optionsRef = useRef(options);
  const confusablesRef = useRef(confusables);
  const attemptsRef = useRef(attemptsUsed ?? 0);
  const onAttemptsUsedRef = useRef(onAttemptsUsed);
  const phraseRef = useRef(phrase);
  const recordingRef = useRef<string | null>(null);

  const attempts = attemptsUsed ?? localAttempts;
  const selfCompare = mode !== 'dialog' && needsSelfCompare(phrase);

  useEffect(() => {
    onMatchRef.current = onMatch;
    optionsRef.current = options;
    confusablesRef.current = confusables;
    onAttemptsUsedRef.current = onAttemptsUsed;
  }, [confusables, onAttemptsUsed, onMatch, options]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  const forgetRecording = useCallback(() => {
    deleteSpeechFile(recordingRef.current);
    recordingRef.current = null;
    setRecordingUri(null);
  }, []);

  useEffect(() => {
    return () => {
      deleteSpeechFile(recordingRef.current);
    };
  }, []);

  useEffect(() => {
    if (phraseRef.current === phrase) return;
    phraseRef.current = phrase;
    setScored(null);
    setLocalAttempts(0);
    setDialogMiss(false);
    setConfirmed(false);
    setCompareToken(0);
    forgetRecording();
  }, [forgetRecording, phrase]);

  const hints = useMemo(
    () => (mode === 'dialog' ? options.map((option) => option.es) : []),
    [mode, options],
  );

  const onFinal = useCallback(
    (result: SpeechFinal) => {
      const nextCount = Math.min(SPEECH_MAX_ATTEMPTS, attemptsRef.current + 1);
      attemptsRef.current = nextCount;
      if (onAttemptsUsedRef.current) onAttemptsUsedRef.current(nextCount);
      else setLocalAttempts(nextCount);

      if (mode === 'dialog') {
        const match = matchSpokenOption(result.transcript, optionsRef.current);
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

      const next = scoreSpeech(phrase, result.transcript, {
        confidence: result.confidence,
        alternatives: result.alternatives,
        confusables: confusablesRef.current,
      });
      setScored(next);
      setConfirmed(false);

      if (selfCompare) {
        if (result.recordingUri !== recordingRef.current) {
          deleteSpeechFile(recordingRef.current);
        }
        recordingRef.current = result.recordingUri;
        setRecordingUri(result.recordingUri);
        setCompareToken((token) => token + 1);
        return;
      }

      void Haptics.notificationAsync(
        isSpeechPass(next)
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    },
    [mode, phrase, selfCompare],
  );

  const capture = useSpeechCapture(
    { mode: mode === 'dialog' ? 'dialog' : 'grade', hints, record: selfCompare },
    onFinal,
  );
  const live =
    mode !== 'dialog' && capture.listening && capture.transcript && scored === null
      ? scoreSpeech(phrase, capture.transcript)
      : null;
  const shown = mode === 'dialog' || phrase.length === 0 ? null : (live ?? scored);
  const passed =
    mode !== 'dialog' && (selfCompare ? confirmed : scored !== null && isSpeechPass(scored));
  const comparing = selfCompare && scored !== null && !confirmed;
  const locked = mode !== 'practice' && attempts >= SPEECH_MAX_ATTEMPTS;
  const micBlocked = capture.access === 'blocked' || capture.access === 'unavailable';

  const onMic = () => {
    if (capture.listening) {
      capture.stop();
      return;
    }
    if (locked || micBlocked) return;
    setDialogMiss(false);
    setScored(null);
    setConfirmed(false);
    setCompareToken(0);
    forgetRecording();
    void capture.begin();
  };

  const confirm = () => {
    setConfirmed(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onAgain = () => {
    forgetRecording();
    setScored(null);
    setConfirmed(false);
    setCompareToken(0);
    if (locked || micBlocked) return;
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
    selfCompare,
    comparing,
    compareToken,
    recordingUri,
    attemptsLeft: Math.max(0, SPEECH_MAX_ATTEMPTS - attempts),
    onMic,
    confirm,
    onAgain,
  };
}
