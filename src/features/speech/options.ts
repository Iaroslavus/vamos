import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

/** Iberian Spanish. The recognizer is asked for this locale on every attempt. */
export const SPEECH_LOCALE = 'es-ES';

/** Spoken tries on a speak_repeat step and on a dialog line. */
export const SPEECH_MAX_ATTEMPTS = 3;

export type SpeechAccess = 'unknown' | 'granted' | 'denied' | 'blocked' | 'unavailable';

export function accessFromPermission(permission: {
  granted: boolean;
  canAskAgain?: boolean;
  status?: string;
}): SpeechAccess {
  if (permission.granted) return 'granted';
  if (permission.status === 'denied' && permission.canAskAgain === false) return 'blocked';
  if (permission.status === 'denied') return 'denied';
  return 'unknown';
}

/**
 * On-device es-ES when the model is installed.
 * Otherwise the system recognizer runs (typical iOS Simulator) and still does not save audio.
 */
export function shouldRequireOnDevice(
  supported: boolean,
  installedLocales: readonly string[],
): boolean {
  if (!supported) return false;
  return installedLocales.some((locale) => locale.toLowerCase().startsWith('es'));
}

/** Native meter is −2…10. Anything at or below 0 is treated as silence. */
export function speechVolumeLevel(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1, value / 10);
}

/**
 * One recognition pass.
 * `recordingOptions` and `audioSource` are intentionally absent: the buffer is not written to a file.
 */
export function speechStartOptions(
  onDevice: boolean,
  hints: readonly string[],
): ExpoSpeechRecognitionOptions {
  const contextualStrings = [...new Set(hints.map((hint) => hint.trim()).filter(Boolean))].slice(
    0,
    20,
  );
  return {
    lang: SPEECH_LOCALE,
    interimResults: true,
    continuous: false,
    maxAlternatives: 1,
    requiresOnDeviceRecognition: onDevice,
    addsPunctuation: false,
    contextualStrings,
    iosTaskHint: 'dictation',
    volumeChangeEventOptions: {
      enabled: true,
      intervalMillis: 100,
    },
  };
}
