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

/** How many n-best lines to ask for when grading pronunciation. */
export const SPEECH_ALTERNATIVE_COUNT = 5;

/**
 * `grade` scores pronunciation and must not be told the reference.
 * `dialog` may receive the line options, because it checks which meaning was said.
 * A temp recording is written only when `record` is set, and the caller deletes it.
 */
export function speechStartOptions(
  onDevice: boolean,
  mode: 'grade' | 'dialog',
  hints: readonly string[] = [],
  record = false,
): ExpoSpeechRecognitionOptions {
  const options: ExpoSpeechRecognitionOptions = {
    lang: SPEECH_LOCALE,
    interimResults: true,
    continuous: false,
    maxAlternatives: mode === 'dialog' ? 1 : SPEECH_ALTERNATIVE_COUNT,
    requiresOnDeviceRecognition: onDevice,
    addsPunctuation: false,
    iosTaskHint: 'dictation',
    volumeChangeEventOptions: {
      enabled: true,
      intervalMillis: 100,
    },
  };

  if (mode === 'dialog') {
    const contextualStrings = [...new Set(hints.map((hint) => hint.trim()).filter(Boolean))].slice(
      0,
      20,
    );
    if (contextualStrings.length > 0) options.contextualStrings = contextualStrings;
  }

  if (record) options.recordingOptions = { persist: true };
  return options;
}
