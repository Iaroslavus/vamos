import { useCallback, useEffect, useRef, useState } from 'react';
import { File } from 'expo-file-system';
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

import { stopLessonAudio } from '@/features/audio/playback';

import {
  openWavTake,
  stopSpeechRecognition,
  type RecordingControls,
  type WavTake,
} from '../acoustic/record';
import { acousticRecordingOptions, meterLevel } from '../acoustic/session';
import { deleteSpeechFile } from '../recording';

export type WavBeginResult = 'started' | 'busy' | 'failed';

const recordingControls: RecordingControls = {
  abortRecognition: () => stopSpeechRecognition(),
  stopPlayback: () => stopLessonAudio(),
  requestPermission: () => requestRecordingPermissionsAsync(),
  setAudioMode: (mode) => setAudioModeAsync(mode),
  readFile: async (uri) => new File(uri).arrayBuffer(),
  deleteFile: (uri) => deleteSpeechFile(uri),
};

type UseWavRecorderOptions = {
  /** The native recorder stopped on its own (duration cap). */
  onEnded?: () => void;
};

/**
 * File recording through `useAudioRecorder` (WAV Linear PCM on iOS).
 * One take at a time. Speech recognition and sample playback are released first.
 */
export function useWavRecorder({ onEnded }: UseWavRecorderOptions = {}) {
  const recorder = useAudioRecorder(acousticRecordingOptions());
  const takeRef = useRef<WavTake | null>(null);
  const starting = useRef(false);
  const sawRecording = useRef(false);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);

  const begin = useCallback(async (): Promise<WavBeginResult> => {
    if (starting.current || takeRef.current) return 'busy';
    starting.current = true;
    try {
      const take = await openWavTake(recorder, recordingControls);
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

  const finish = useCallback(async () => {
    const take = takeRef.current;
    if (!take) return null;
    takeRef.current = null;
    sawRecording.current = false;
    setRecording(false);
    setLevel(0);
    return take.finish();
  }, []);

  const discard = useCallback(() => {
    const take = takeRef.current;
    takeRef.current = null;
    sawRecording.current = false;
    starting.current = false;
    setRecording(false);
    setLevel(0);
    take?.discard();
  }, []);

  useEffect(() => {
    if (!recording) return undefined;
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
      if (sawRecording.current && !status.isRecording) {
        sawRecording.current = false;
        onEndedRef.current?.();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [recorder, recording]);

  useEffect(() => {
    return () => {
      const take = takeRef.current;
      takeRef.current = null;
      take?.discard();
    };
  }, []);

  return { recording, level, begin, finish, discard };
}
