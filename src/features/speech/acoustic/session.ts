import { Platform } from 'react-native';

import type { RecordingOptions } from 'expo-audio';

import { ACOUSTIC } from './config';

/**
 * Rate the input hardware actually delivers (Mac simulator and modern iPhones).
 * Asking AudioStream for {@link ACOUSTIC.sampleRate} makes `installTap` see 0 Hz
 * and throw an exception JavaScript cannot catch. The file is resampled to 16 kHz
 * mono in `decodeWavPcm`.
 */
export const NATIVE_PCM_RATE = 48_000;

/** Safety cap so a take cannot hold the microphone open. */
export const MAX_TAKE_SECONDS = 8;

export const RECORDING_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
  interruptionMode: 'duckOthers',
  shouldRouteThroughEarpiece: false,
} as const;

export const PLAYBACK_AUDIO_MODE = {
  allowsRecording: false,
  playsInSilentMode: true,
  interruptionMode: 'duckOthers',
  shouldRouteThroughEarpiece: false,
} as const;

export type AudioSessionMode = typeof RECORDING_AUDIO_MODE | typeof PLAYBACK_AUDIO_MODE;

/**
 * WAV Linear PCM at the hardware rate.
 * Android's recorder has no PCM container, so it stays AAC and the decoder skips it.
 */
export function acousticRecordingOptions(): RecordingOptions {
  const linearPcm = Platform.OS !== 'android';
  return {
    directory: 'cache',
    extension: linearPcm ? '.wav' : '.m4a',
    sampleRate: NATIVE_PCM_RATE,
    numberOfChannels: 1,
    bitRate: linearPcm ? NATIVE_PCM_RATE * 16 : 128_000,
    isMeteringEnabled: true,
    android: {
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      audioSource: 'mic',
    },
    ios: {
      outputFormat: 'lpcm',
      audioQuality: 0x60,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: linearPcm ? 'audio/wav' : 'audio/mp4',
    },
  };
}

/** True when the prepared recorder has a live input we can start without guessing. */
export function recordingInputReady(
  inputs: readonly { uid?: string | null }[] | null | undefined,
  current: { uid?: string | null } | null | undefined,
): boolean {
  const uid = current?.uid;
  if (!uid) return false;
  return (inputs ?? []).some((input) => input.uid === uid);
}

/** Map an expo-audio meter (dBFS, silence near −160) onto 0…1. */
export function meterLevel(db: number | undefined): number {
  if (db == null || !Number.isFinite(db) || db <= -60) return 0;
  if (db >= 0) return 1;
  return (db + 60) / 60;
}

export function captureRateIsNative(sampleRate: number): boolean {
  return sampleRate > 0 && sampleRate !== ACOUSTIC.sampleRate;
}
