import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import * as Speech from 'expo-speech';

import { BUNDLED_AUDIO_ASSETS } from './assets';

export const NORMAL_RATE = 1;
/** Slow listen button — 0.7× (DESIGN / content rules). */
export const SLOW_RATE = 0.7;
export const SPEECH_LANGUAGE = 'es-ES';

export type PlaybackSource = 'file' | 'speech';

export type PlayLessonAudioInput = {
  /** Content path or remote URI; if unresolved, falls back to speech. */
  audio?: string | null;
  /** Spanish text for TTS fallback (and always used when no file). */
  text: string;
  rate?: number;
};

let activePlayer: AudioPlayer | null = null;

export function resolveAudioSource(audio?: string | null): AudioSource | null {
  if (!audio) return null;

  const bundled = BUNDLED_AUDIO_ASSETS[audio];
  if (bundled !== undefined) return bundled;

  if (
    audio.startsWith('http://') ||
    audio.startsWith('https://') ||
    audio.startsWith('file://') ||
    audio.startsWith('content://')
  ) {
    return audio;
  }

  return null;
}

export async function stopLessonAudio(): Promise<void> {
  await Speech.stop();
  if (activePlayer) {
    try {
      activePlayer.pause();
      activePlayer.remove();
    } catch {
      // ignore teardown errors
    }
    activePlayer = null;
  }
}

/**
 * Play exercise audio: prefer a resolved file via expo-audio, otherwise expo-speech (es-ES).
 */
export async function playLessonAudio({
  audio,
  text,
  rate = NORMAL_RATE,
}: PlayLessonAudioInput): Promise<PlaybackSource> {
  const trimmed = text.trim();
  if (!trimmed && !audio) {
    return 'speech';
  }

  await stopLessonAudio();

  const source = resolveAudioSource(audio);
  if (source) {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      });
      const player = createAudioPlayer(source);
      activePlayer = player;
      player.setPlaybackRate(rate, 'high');
      player.play();
      return 'file';
    } catch {
      activePlayer = null;
      // Fall through to speech while TTS files / network are unavailable.
    }
  }

  if (trimmed) {
    Speech.speak(trimmed, {
      language: SPEECH_LANGUAGE,
      rate,
    });
  }

  return 'speech';
}
