import { useCallback, useEffect, useRef, useState } from 'react';
import { File } from 'expo-file-system';
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

import { stopLessonAudio } from '@/features/audio/playback';

import {
  openWavTake,
  stopSpeechRecognition,
  type RecordingControls,
  type WavTake,
  type WavTakeResult,
} from '../acoustic/record';
import { acousticRecordingOptions, meterLevel } from '../acoustic/session';
import { deleteSpeechFile } from '../recording';
import { MAX_TAKE_MS, SPEECH_LEVEL, takeStopReason } from '../takeStop';

export type WavBeginResult = 'started' | 'busy' | 'failed' | 'cancelled';

const TICK_MS = 100;

const recordingOptions = acousticRecordingOptions();

const recordingControls: RecordingControls = {
  abortRecognition: () => stopSpeechRecognition(),
  stopPlayback: () => stopLessonAudio(),
  requestPermission: () => requestRecordingPermissionsAsync(),
  setAudioMode: (mode) => setAudioModeAsync(mode),
  readFile: async (uri) => new File(uri).arrayBuffer(),
  deleteFile: (uri) => deleteSpeechFile(uri),
};

type UseWavRecorderOptions = {
  /** Twice the sample, already capped. Unknown samples stay on the 8 second maximum. */
  limitMs?: number;
  /** The take ended: the learner stopped it, silence, or the duration cap. */
  onEnded?: () => void;
};

/**
 * File recording through `useAudioRecorder` (WAV Linear PCM on iOS).
 * One take at a time. Speech recognition and sample playback are released first.
 * `isLive` reads the take itself, so a tap can stop it before React paints the button.
 */
export function useWavRecorder({ limitMs = MAX_TAKE_MS, onEnded }: UseWavRecorderOptions = {}) {
  const recorder = useAudioRecorder(recordingOptions);
  const takeRef = useRef<WavTake | null>(null);
  const starting = useRef(false);
  const cancelRequested = useRef(false);
  const sawRecording = useRef(false);
  const onEndedRef = useRef(onEnded);
  const limitRef = useRef(limitMs);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    limitRef.current = limitMs;
  }, [limitMs]);

  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);

  const begin = useCallback(async (): Promise<WavBeginResult> => {
    if (starting.current || takeRef.current) return 'busy';
    starting.current = true;
    cancelRequested.current = false;
    try {
      const take = await openWavTake(recorder, recordingControls, limitRef.current / 1000);
      if (cancelRequested.current) {
        take?.discard();
        cancelRequested.current = false;
        return 'cancelled';
      }
      if (!take) return 'failed';
      takeRef.current = take;
      sawRecording.current = true;
      setRecording(true);
      setLevel(0);
      return 'started';
    } catch {
      return 'failed';
    } finally {
      starting.current = false;
    }
  }, [recorder]);

  const finish = useCallback(async (): Promise<WavTakeResult | null | 'cancelled'> => {
    const take = takeRef.current;
    if (!take) {
      if (starting.current) cancelRequested.current = true;
      return 'cancelled';
    }
    takeRef.current = null;
    sawRecording.current = false;
    setRecording(false);
    setLevel(0);
    return take.finish();
  }, []);

  const discard = useCallback(() => {
    cancelRequested.current = true;
    const take = takeRef.current;
    takeRef.current = null;
    sawRecording.current = false;
    starting.current = false;
    setRecording(false);
    setLevel(0);
    if (take) {
      take.discard();
      return;
    }
    try {
      if (recorder.getStatus().isRecording) void recorder.stop().catch(() => undefined);
    } catch {
      // The native recorder can throw once it has already been released.
    }
  }, [recorder]);

  const isLive = useCallback(() => starting.current || takeRef.current !== null, []);

  useEffect(() => {
    if (!recording) return undefined;
    const startedAt = Date.now();
    let speechHeard = false;
    let lastSpeechAt = startedAt;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      onEndedRef.current?.();
    };
    const timer = setInterval(() => {
      if (!takeRef.current) return;
      let status: { isRecording: boolean; metering?: number };
      try {
        status = recorder.getStatus();
      } catch {
        return;
      }
      const next = meterLevel(status.metering);
      setLevel((current) => (Math.abs(current - next) < 0.02 ? current : next));
      const now = Date.now();
      if (next >= SPEECH_LEVEL) {
        speechHeard = true;
        lastSpeechAt = now;
      }
      const reason = takeStopReason({
        elapsedMs: now - startedAt,
        limitMs: limitRef.current,
        speechHeard,
        silenceMs: speechHeard ? now - lastSpeechAt : 0,
      });
      if (reason || (sawRecording.current && !status.isRecording)) {
        sawRecording.current = false;
        end();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [recorder, recording]);

  useEffect(() => {
    return () => {
      discard();
    };
  }, [discard]);

  return { recording, level, begin, finish, discard, isLive };
}
