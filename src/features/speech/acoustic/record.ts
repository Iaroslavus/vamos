import { File } from 'expo-file-system';

import { deleteSpeechFile } from '../recording';
import { ACOUSTIC } from './config';
import { decodeWavPcm } from './wav';

type PcmStream = {
  start: () => Promise<void>;
  stop: () => void;
  startFileRecordingAsync: (options: {
    format: 'wav';
    directory: 'cache';
  }) => Promise<{ uri: string }>;
  stopFileRecordingAsync: () => Promise<{ uri: string }>;
};

export type WavTake = {
  /** Stop, read the WAV, and delete the file. Null when the file could not be read. */
  finish: () => Promise<Float32Array | null>;
  discard: () => void;
};

/**
 * Record mono 16 kHz PCM in a WAV container.
 * Returns null when the microphone or the native stream is unavailable.
 * The file is deleted as soon as it has been read.
 */
export async function beginWavTake(): Promise<WavTake | null> {
  let stream: PcmStream;
  let uri: string | null = null;
  try {
    const audio = await import('expo-audio');
    const native = audio.AudioModule as unknown as {
      AudioStream?: new (options: {
        sampleRate: number;
        channels: number;
        encoding: 'int16';
      }) => PcmStream;
    };
    const Stream = native.AudioStream;
    if (typeof Stream !== 'function') return null;
    const permission = await audio.requestRecordingPermissionsAsync();
    if (!permission.granted) return null;
    await audio.setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    });
    stream = new Stream({
      sampleRate: ACOUSTIC.sampleRate,
      channels: 1,
      encoding: 'int16',
    });
    await stream.start();
    const started = await stream.startFileRecordingAsync({ format: 'wav', directory: 'cache' });
    uri = started.uri;
  } catch {
    deleteSpeechFile(uri);
    return null;
  }

  let settled = false;
  const close = () => {
    try {
      stream.stop();
    } catch {
      // The stream may already have been released.
    }
  };

  return {
    async finish() {
      if (settled) return null;
      settled = true;
      try {
        const result = await stream.stopFileRecordingAsync();
        close();
        const fileUri = result.uri || uri;
        if (!fileUri) return null;
        const bytes = new Uint8Array(await new File(fileUri).arrayBuffer());
        deleteSpeechFile(fileUri);
        return decodeWavPcm(bytes).samples;
      } catch {
        close();
        deleteSpeechFile(uri);
        return null;
      }
    },
    discard() {
      if (settled) return;
      settled = true;
      close();
      deleteSpeechFile(uri);
    },
  };
}
