import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';

import { assessRecording, combinePronunciationScore } from '../acoustic/assess';
import type { UnitFeatures } from '../acoustic/reference';
import { errorFindings, type AcousticFinding } from '../acoustic/rules';
import { useSpeechCapture, type SpeechFinal } from './useSpeechCapture';
import { useWavRecorder } from './useWavRecorder';
import { SPEECH_MAX_ATTEMPTS } from '../options';
import { deleteSpeechFile } from '../recording';
import {
  SPEECH_PASS_SCORE,
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
  /** Score that counts as understood. Lessons leave this on the speech default. */
  passScore?: number;
};

/**
 * Scores one spoken attempt against a reference phrase, or matches a dialog line.
 * Never reads or writes the lesson store: practice misses do not spend hearts.
 * One- and two-word phrases wait for the learner to compare the take with the sample.
 * The acoustic file is the only microphone capture; recognition runs on that file afterwards.
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
  passScore = SPEECH_PASS_SCORE,
}: UseSpeakPracticeInput) {
  const [localAttempts, setLocalAttempts] = useState(0);
  const [scored, setScored] = useState<SpeechScore | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [compareToken, setCompareToken] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [dialogMiss, setDialogMiss] = useState(false);
  const [findings, setFindings] = useState<AcousticFinding[]>([]);
  const [micUnavailable, setMicUnavailable] = useState(false);
  const onMatchRef = useRef(onMatch);
  const optionsRef = useRef(options);
  const confusablesRef = useRef(confusables);
  const attemptsRef = useRef(attemptsUsed ?? 0);
  const onAttemptsUsedRef = useRef(onAttemptsUsed);
  const phraseRef = useRef(phrase);
  const recordingRef = useRef<string | null>(null);
  const acousticSamples = useRef<Float32Array | null>(null);
  const takeGeneration = useRef(0);
  const scoreGeneration = useRef(0);
  const finishRef = useRef<() => void>(() => undefined);
  const wav = useWavRecorder({ onEnded: () => finishRef.current() });
  const wavRef = useRef(wav);
  const referencesRef = useRef(references);
  const passScoreRef = useRef(passScore);

  const attempts = attemptsUsed ?? localAttempts;
  const selfCompare = mode !== 'dialog' && needsSelfCompare(phrase);

  useEffect(() => {
    onMatchRef.current = onMatch;
    optionsRef.current = options;
    confusablesRef.current = confusables;
    onAttemptsUsedRef.current = onAttemptsUsed;
    referencesRef.current = references;
    passScoreRef.current = passScore;
  }, [confusables, onAttemptsUsed, onMatch, options, passScore, references]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  const forgetRecording = useCallback(() => {
    takeGeneration.current += 1;
    wavRef.current.discard();
    acousticSamples.current = null;
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
    setFindings([]);
    setMicUnavailable(false);
    forgetRecording();
  }, [forgetRecording, phrase]);

  const hints = useMemo(
    () => (mode === 'dialog' ? options.map((option) => option.es) : []),
    [mode, options],
  );

  const onFinal = useCallback(
    (result: SpeechFinal) => {
      if (mode !== 'dialog' && scoreGeneration.current !== takeGeneration.current) return;

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
      const samples = acousticSamples.current;
      acousticSamples.current = null;

      const publish = (taken: Float32Array | null) => {
        const acoustic = taken ? assessRecording(taken, referencesRef.current, phrase) : null;
        const next = {
          ...text,
          score: combinePronunciationScore(
            text.score,
            acoustic?.similarity ?? null,
            acoustic?.penalty ?? 0,
          ),
        };
        setMicUnavailable(false);
        setFindings(errorFindings(acoustic?.findings ?? []));
        setScored(next);
        setConfirmed(false);

        if (selfCompare) {
          const uri = recordingRef.current ?? result.recordingUri;
          if (result.recordingUri && result.recordingUri !== uri) {
            deleteSpeechFile(result.recordingUri);
          }
          recordingRef.current = uri;
          setRecordingUri(uri);
          setCompareToken((token) => token + 1);
          return;
        }

        deleteSpeechFile(recordingRef.current);
        deleteSpeechFile(result.recordingUri);
        recordingRef.current = null;
        void Haptics.notificationAsync(
          isSpeechPass(next, passScoreRef.current)
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        );
      };

      publish(samples);
    },
    [mode, phrase, selfCompare],
  );

  const capture = useSpeechCapture(
    { mode: mode === 'dialog' ? 'dialog' : 'grade', hints, record: selfCompare },
    onFinal,
  );
  const captureRef = useRef(capture);

  useEffect(() => {
    wavRef.current = wav;
    captureRef.current = capture;
  }, [capture, wav]);

  const finishAndRecognize = useCallback(async () => {
    const generation = takeGeneration.current;
    const result = await wavRef.current.finish();
    if (takeGeneration.current !== generation) return;
    if (!result?.uri) {
      setMicUnavailable(true);
      return;
    }
    acousticSamples.current = result.samples;
    recordingRef.current = result.uri;
    scoreGeneration.current = generation;
    const started = await captureRef.current.beginFile(result.uri);
    if (takeGeneration.current !== generation) return;
    if (!started) {
      onFinal({
        transcript: '',
        confidence: -1,
        alternatives: [],
        recordingUri: result.uri,
      });
    }
  }, [onFinal]);

  useEffect(() => {
    finishRef.current = () => {
      void finishAndRecognize();
    };
  }, [finishAndRecognize]);

  const startTake = useCallback(() => {
    const generation = takeGeneration.current;
    void wavRef.current.begin().then((result) => {
      if (takeGeneration.current !== generation) {
        if (result === 'started') wavRef.current.discard();
        return;
      }
      if (result === 'failed') setMicUnavailable(true);
      if (result === 'started') setMicUnavailable(false);
    });
  }, []);

  const live =
    mode !== 'dialog' && capture.listening && capture.transcript && scored === null
      ? scoreSpeech(phrase, capture.transcript)
      : null;
  const shown = mode === 'dialog' || phrase.length === 0 ? null : (live ?? scored);
  const passed =
    mode !== 'dialog' &&
    (selfCompare ? confirmed : scored !== null && isSpeechPass(scored, passScore));
  const comparing = selfCompare && scored !== null && !confirmed;
  const locked = mode !== 'practice' && attempts >= SPEECH_MAX_ATTEMPTS;
  const micBlocked = capture.access === 'blocked' || capture.access === 'unavailable';

  const onMic = () => {
    if (mode !== 'dialog' && wav.recording) {
      void finishAndRecognize();
      return;
    }
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
    setMicUnavailable(false);
    forgetRecording();
    if (mode === 'dialog') {
      void capture.begin();
      return;
    }
    startTake();
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
    setMicUnavailable(false);
    if (locked || micBlocked) return;
    if (mode === 'dialog') {
      void capture.begin();
      return;
    }
    startTake();
  };

  const cancelRecording = () => {
    if (!wav.recording) return;
    takeGeneration.current += 1;
    wav.discard();
    acousticSamples.current = null;
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
    micUnavailable,
    recording: wav.recording,
    level: wav.level,
    dialogMiss,
    selfCompare,
    comparing,
    compareToken,
    recordingUri,
    attemptsLeft: Math.max(0, SPEECH_MAX_ATTEMPTS - attempts),
    onMic,
    confirm,
    onAgain,
    cancelRecording,
    findings,
  };
}
