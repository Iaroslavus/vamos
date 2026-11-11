import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';

import { assessRecording, combinePronunciationScore } from '../acoustic/assess';
import type { UnitFeatures } from '../acoustic/reference';
import { useSpeechCapture, type SpeechFinal } from './useSpeechCapture';
import { useWavRecorder } from './useWavRecorder';
import { SPEECH_MAX_ATTEMPTS } from '../options';
import { deleteSpeechFile } from '../recording';
import {
  SPEECH_PASS_SCORE,
  isSpeechPass,
  matchSpokenOption,
  scoreSpeech,
  type SpeechOption,
  type SpeechScore,
} from '../score';
import { SPEECH_LEVEL, takeLimitMs, takeStopReason } from '../takeStop';

export type SpeakPracticeMode = 'step' | 'practice' | 'dialog';

const NO_OPTIONS: readonly SpeechOption[] = [];
const NO_CONFUSABLES: readonly string[] = [];
const WATCH_MS = 100;

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
  /** Reference clip length. Null uses the 8 second cap. */
  sampleDurationMs?: number | null;
};

/**
 * Scores one spoken attempt against a reference phrase, or matches a dialog line.
 * Never reads or writes the lesson store: practice misses do not spend hearts.
 * The acoustic file is the only microphone capture; recognition runs on that file afterwards.
 * A tap, a second of silence, or the duration cap ends the take and grades it.
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
  sampleDurationMs = null,
}: UseSpeakPracticeInput) {
  const [localAttempts, setLocalAttempts] = useState(0);
  const [scored, setScored] = useState<SpeechScore | null>(null);
  const [dialogMiss, setDialogMiss] = useState(false);
  const [micUnavailable, setMicUnavailable] = useState(false);
  const [grading, setGrading] = useState(false);
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
  const gradingRef = useRef(false);
  const finishRef = useRef<() => void>(() => undefined);
  const limitMs = takeLimitMs(sampleDurationMs);
  const wav = useWavRecorder({ limitMs, onEnded: () => finishRef.current() });
  const wavRef = useRef(wav);
  const referencesRef = useRef(references);
  const passScoreRef = useRef(passScore);
  const limitRef = useRef(limitMs);

  const attempts = attemptsUsed ?? localAttempts;

  useEffect(() => {
    onMatchRef.current = onMatch;
    optionsRef.current = options;
    confusablesRef.current = confusables;
    onAttemptsUsedRef.current = onAttemptsUsed;
    referencesRef.current = references;
    passScoreRef.current = passScore;
    limitRef.current = limitMs;
  }, [confusables, limitMs, onAttemptsUsed, onMatch, options, passScore, references]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  const forgetRecording = useCallback(() => {
    takeGeneration.current += 1;
    gradingRef.current = false;
    wavRef.current.discard();
    acousticSamples.current = null;
    deleteSpeechFile(recordingRef.current);
    recordingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      wavRef.current.discard();
      deleteSpeechFile(recordingRef.current);
    };
  }, []);

  useEffect(() => {
    if (phraseRef.current === phrase) return;
    phraseRef.current = phrase;
    setScored(null);
    setLocalAttempts(0);
    setDialogMiss(false);
    setMicUnavailable(false);
    setGrading(false);
    forgetRecording();
  }, [forgetRecording, phrase]);

  const hints = useMemo(
    () => (mode === 'dialog' ? options.map((option) => option.es) : []),
    [mode, options],
  );

  const onFinal = useCallback(
    (result: SpeechFinal) => {
      gradingRef.current = false;
      setGrading(false);
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
      const acoustic = samples ? assessRecording(samples, referencesRef.current, phrase) : null;
      const next = {
        ...text,
        score: combinePronunciationScore(
          text.score,
          acoustic?.similarity ?? null,
          acoustic?.penalty ?? 0,
        ),
      };
      setMicUnavailable(false);
      setScored(next);
      deleteSpeechFile(recordingRef.current);
      deleteSpeechFile(result.recordingUri);
      recordingRef.current = null;
      void Haptics.notificationAsync(
        isSpeechPass(next, passScoreRef.current)
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    },
    [mode, phrase],
  );

  const capture = useSpeechCapture(
    { mode: mode === 'dialog' ? 'dialog' : 'grade', hints, record: false },
    onFinal,
  );
  const captureRef = useRef(capture);
  const dialogListeningRef = useRef(false);
  const dialogLevelRef = useRef(0);
  useEffect(() => {
    wavRef.current = wav;
    captureRef.current = capture;
    dialogListeningRef.current = capture.listening;
    dialogLevelRef.current = capture.volume;
  });

  const finishAndRecognize = useCallback(async () => {
    const generation = takeGeneration.current;
    const outcome = await wavRef.current.finish();
    if (takeGeneration.current !== generation) {
      if (outcome !== 'cancelled') deleteSpeechFile(outcome?.uri);
      return;
    }
    if (outcome === 'cancelled') {
      gradingRef.current = false;
      setGrading(false);
      return;
    }
    if (!outcome?.uri) {
      gradingRef.current = false;
      setGrading(false);
      setMicUnavailable(true);
      return;
    }
    acousticSamples.current = outcome.samples;
    recordingRef.current = outcome.uri;
    scoreGeneration.current = generation;
    const started = await captureRef.current.beginFile(outcome.uri);
    if (takeGeneration.current !== generation) return;
    if (!started) {
      onFinal({
        transcript: '',
        confidence: -1,
        alternatives: [],
        recordingUri: outcome.uri,
      });
    }
  }, [onFinal]);

  useEffect(() => {
    finishRef.current = () => {
      if (gradingRef.current) return;
      gradingRef.current = true;
      setGrading(true);
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
      if (result === 'cancelled') return;
      if (result === 'failed') {
        gradingRef.current = false;
        setGrading(false);
        setMicUnavailable(true);
      }
      if (result === 'started') setMicUnavailable(false);
    });
  }, []);

  useEffect(() => {
    if (mode !== 'dialog' || !capture.listening) return undefined;
    const startedAt = Date.now();
    let speechHeard = false;
    let lastSpeechAt = startedAt;
    let stopped = false;
    const timer = setInterval(() => {
      if (stopped) return;
      const level = dialogLevelRef.current;
      const now = Date.now();
      if (level >= SPEECH_LEVEL) {
        speechHeard = true;
        lastSpeechAt = now;
      }
      const reason = takeStopReason({
        elapsedMs: now - startedAt,
        limitMs: limitRef.current,
        speechHeard,
        silenceMs: speechHeard ? now - lastSpeechAt : 0,
      });
      if (!reason) return;
      stopped = true;
      captureRef.current.stop();
    }, WATCH_MS);
    return () => clearInterval(timer);
  }, [capture.listening, mode]);

  const live =
    mode !== 'dialog' && capture.listening && capture.transcript && scored === null
      ? scoreSpeech(phrase, capture.transcript)
      : null;
  const shown = mode === 'dialog' || phrase.length === 0 ? null : (live ?? scored);
  const passed = mode !== 'dialog' && scored !== null && isSpeechPass(scored, passScore);
  const locked = mode !== 'practice' && attempts >= SPEECH_MAX_ATTEMPTS;
  const micBlocked = capture.access === 'blocked' || capture.access === 'unavailable';

  const onMic = () => {
    if (mode === 'dialog') {
      if (dialogListeningRef.current) {
        captureRef.current.stop();
        return;
      }
      if (locked || micBlocked) return;
      setDialogMiss(false);
      void capture.begin();
      return;
    }
    if (gradingRef.current) return;
    if (wavRef.current.isLive()) {
      gradingRef.current = true;
      setGrading(true);
      void finishAndRecognize();
      return;
    }
    if (locked || micBlocked) return;
    setDialogMiss(false);
    setScored(null);
    setMicUnavailable(false);
    forgetRecording();
    startTake();
  };

  const onAgain = () => {
    if (locked || micBlocked || gradingRef.current) return;
    setScored(null);
    setDialogMiss(false);
    setMicUnavailable(false);
    forgetRecording();
    if (mode === 'dialog') {
      void capture.begin();
      return;
    }
    startTake();
  };

  const cancelRecording = () => {
    takeGeneration.current += 1;
    gradingRef.current = false;
    setGrading(false);
    wavRef.current.discard();
    if (dialogListeningRef.current) captureRef.current.stop();
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
      stop();
    };
  }, [begin, mode, stop]);

  return {
    capture,
    shown,
    passed,
    locked,
    micBlocked,
    micUnavailable,
    grading,
    recording: wav.recording,
    level: wav.level,
    dialogMiss,
    attemptsLeft: Math.max(0, SPEECH_MAX_ATTEMPTS - attempts),
    onMic,
    onAgain,
    cancelRecording,
  };
}
