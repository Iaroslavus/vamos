import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { decodeWavPcm } from './wav';
import {
  MAX_TAKE_SECONDS,
  PLAYBACK_AUDIO_MODE,
  RECORDING_AUDIO_MODE,
  recordingInputReady,
  type AudioSessionMode,
} from './session';

const RECOGNITION_STOP_MS = 500;

export type WavTakeResult = {
  samples: Float32Array | null;
  uri: string;
};

export type WavTake = {
  /** Stop, read the file, and restore playback. Null when the recorder itself failed. */
  finish: () => Promise<WavTakeResult | null>;
  discard: () => void;
};

export type PcmRecorder = {
  prepareToRecordAsync: () => Promise<void>;
  getAvailableInputs: () => readonly { uid?: string | null }[];
  getCurrentInput: () => Promise<{ uid?: string | null }>;
  record: (options?: { forDuration?: number }) => void;
  stop: () => Promise<void>;
  getStatus: () => { isRecording: boolean; url?: string | null };
  readonly uri: string | null;
};

export type RecordingControls = {
  abortRecognition: () => Promise<void> | void;
  stopPlayback: () => Promise<void>;
  requestPermission: () => Promise<{ granted: boolean }>;
  setAudioMode: (mode: AudioSessionMode) => Promise<void>;
  readFile: (uri: string) => Promise<ArrayBuffer>;
  deleteFile: (uri: string | null | undefined) => void;
};

/**
 * Wait until speech recognition has dropped the microphone.
 * `abort` is asynchronous; starting a recorder before `end` leaves the input at 0 Hz.
 */
export function stopSpeechRecognition(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      resolve();
    };
    const subscription = ExpoSpeechRecognitionModule.addListener('end', () => {
      finish();
    });
    const timer = setTimeout(finish, RECOGNITION_STOP_MS);
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      finish();
    }
  });
}

/**
 * One microphone take as a WAV file.
 * AudioStream is not used: its `start()` installs a tap before anyone can see the
 * hardware format, and a 0 Hz input (simulator I/O → None, or a session still held
 * by playback / recognition) raises an Objective-C exception that never reaches JS.
 * `prepare` + `getAvailableInputs` fail with a normal rejection instead.
 */
export async function openWavTake(
  recorder: PcmRecorder,
  io: RecordingControls,
): Promise<WavTake | null> {
  let recordingMode = false;
  const restorePlayback = async () => {
    recordingMode = false;
    try {
      await io.setAudioMode(PLAYBACK_AUDIO_MODE);
    } catch {
      // Playback mode is applied again the next time a clip starts.
    }
  };

  try {
    await io.abortRecognition();
    await io.stopPlayback();
    const permission = await io.requestPermission();
    if (!permission.granted) return null;
    await io.setAudioMode(RECORDING_AUDIO_MODE);
    recordingMode = true;
    await recorder.prepareToRecordAsync();
    let current: { uid?: string | null } | null = null;
    try {
      current = await recorder.getCurrentInput();
    } catch {
      current = null;
    }
    if (!recordingInputReady(recorder.getAvailableInputs(), current)) {
      await restorePlayback();
      return null;
    }
    recorder.record({ forDuration: MAX_TAKE_SECONDS });
    if (!recorder.getStatus().isRecording) {
      await restorePlayback();
      return null;
    }
  } catch {
    if (recordingMode) await restorePlayback();
    return null;
  }

  let settled = false;
  return {
    async finish() {
      if (settled) return null;
      settled = true;
      try {
        await recorder.stop();
      } catch {
        await restorePlayback();
        return null;
      }
      await restorePlayback();
      const uri = recorder.uri || recorder.getStatus().url;
      if (!uri) return null;
      try {
        const bytes = new Uint8Array(await io.readFile(uri));
        return { samples: decodeWavPcm(bytes).samples, uri };
      } catch {
        return { samples: null, uri };
      }
    },
    discard() {
      if (settled) return;
      settled = true;
      void recorder.stop().catch(() => undefined);
      void restorePlayback();
      io.deleteFile(recorder.uri || recorder.getStatus().url);
    },
  };
}
