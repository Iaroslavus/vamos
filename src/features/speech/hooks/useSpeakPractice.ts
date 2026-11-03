import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';

import { assessRecording, combinePronunciationScore } from '../acoustic/assess';
import { beginWavTake, type WavTake } from '../acoustic/record';
import type { UnitFeatures } from '../acoustic/reference';
import { errorFindings, type AcousticFinding } from '../acoustic/rules';
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
  /** Normal-speed MFCC for each voice. Null keeps the text score on its own. */
  references?: UnitFeatures | null;
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
  references = null,
}: UseSpeakPracticeInput) {
  const [localAttempts, setLocalAttempts] = useState(0);
  const [scored, setScored] = useState<SpeechScore | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [compareToken, setCompareToken] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [dialogMiss, setDialogMiss] = useState(false);
  const [findings, setFindings] = useState<AcousticFinding[]>([]);
  const onMatchRef = useRef(onMatch);
  const optionsRef = useRef(options);
  const confusablesRef = useRef(confusables);
  const attemptsRef = useRef(attemptsUsed ?? 0);
  const onAttemptsUsedRef = useRef(onAttemptsUsed);
  const phraseRef = useRef(phrase);
  const recordingRef = useRef<string | null>(null);
  const takeRef = useRef<WavTake | null>(null);
  const takeGeneration = useRef(0);
  const referencesRef = useRef(references);

  const attempts = attemptsUsed ?? localAttempts;
  const selfCompare = mode !== 'dialog' && needsSelfCompare(phrase);

  useEffect(() => {
    onMatchRef.current = onMatch;
    optionsRef.current = options;
    confusablesRef.current = confusables;
    onAttemptsUsedRef.current = onAttemptsUsed;
    referencesRef.current = references;
  }, [confusables, onAttemptsUsed, onMatch, options, references]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  const forgetRecording = useCallback(() => {
    takeGeneration.current += 1;
    takeRef.current?.discard();
    takeRef.current = null;
    deleteSpeechFile(recordingRef.current);
    recordingRef.current = null;
    setRecordingUri(null);
  }, []);

  useEffect(() => {
    return () => {
      takeRef.current?.discard();
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
    setFindings([]);
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

      const text = scoreSpeech(phrase, result.transcript, {
        confidence: result.confidence,
        alternatives: result.alternatives,
        confusables: confusablesRef.current,
      });
      takeGeneration.current += 1;
      const take = takeRef.current;
      takeRef.current = null;

      const publish = (samples: Float32Array | null) => {
        const acoustic = samples ? assessRecording(samples, referencesRef.current, phrase) : null;
        const next = {
          ...text,
          score: combinePronunciationScore(
            text.score,
            acoustic?.similarity ?? null,
            acoustic?.penalty ?? 0,
          ),
        };
        setFindings(errorFindings(acoustic?.findings ?? []));
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
      };

      if (take) void take.finish().then(publish);
      else publish(null);
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
    setFindings([]);
    forgetRecording();
    const generation = takeGeneration.current;
    void capture.begin().then((started) => {
      if (!started || mode === 'dialog' || takeGeneration.current !== generation) return;
      void beginWavTake().then((take) => {
        if (!take) return;
        if (takeGeneration.current !== generation) {
          take.discard();
          return;
        }
        takeRef.current = take;
      });
    });
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
    findings,
  };
}
