import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import * as Speech from 'expo-speech';

import { BUNDLED_AUDIO_ASSETS } from './assets';

export const NORMAL_RATE = 1;
/** Slow listen button — 0.7× normal, pitch preserved. */
export const SLOW_RATE = 0.7;
export const SPEECH_LANGUAGE = 'es-ES';
/** Keep TTS pitch at normal when changing rate. */
export const SPEECH_PITCH = 1;

export type PlaybackSource = 'file' | 'speech';

export type PlayLessonAudioInput = {
  /** Content path or remote URI; if unresolved, falls back to speech. */
  audio?: string | null;
  /** Spanish text for TTS fallback (and always used when no file). */
  text: string;
  rate?: number;
};

let activePlayer: AudioPlayer | null = null;
/** Monotonic token so overlapping play calls only keep the latest session. */
let playGeneration = 0;

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
  playGeneration += 1;
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
 * Apply rate with pitch correction.
 *
 * On iOS, `setPlaybackRate` only writes `AVPlayer.rate` while the player is
 * already playing (`if player.isPlaying { ref.rate = … }`). Setting the rate
 * *before* `play()` only stores `currentRate`; if play races or the item is
 * not ready, slow playback never sticks. Always set rate after `play()`.
 */
export function applyPlayerRate(player: AudioPlayer, rate: number): void {
  player.shouldCorrectPitch = true;
  player.setPlaybackRate(rate, 'high');
}

/**
 * Play exercise audio: prefer a resolved file via expo-audio, otherwise expo-speech (es-ES).
 * Always stops any in-flight playback first so a re-press restarts instead of stacking.
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

  // Bump generation inside stop so a newer call wins over an in-flight older one.
  await stopLessonAudio();
  const generation = playGeneration;

  const source = resolveAudioSource(audio);
  if (source) {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      });
      if (generation !== playGeneration) {
        return 'file';
      }

      const player = createAudioPlayer(source);
      activePlayer = player;
      player.shouldCorrectPitch = true;
      // Start, then apply rate so iOS updates the live AVPlayer.rate (pitch preserved).
      player.play();
      applyPlayerRate(player, rate);
      return 'file';
    } catch {
      activePlayer = null;
      // Fall through to speech while TTS files / network are unavailable.
    }
  }

  if (trimmed && generation === playGeneration) {
    // expo-speech iOS: utterance.rate = rate * AVSpeechUtteranceDefaultSpeechRate
    // so 1.0 ≈ normal, 0.7 ≈ 0.7×. pitch stays at 1.0 (height preserved).
    Speech.speak(trimmed, {
      language: SPEECH_LANGUAGE,
      rate,
      pitch: SPEECH_PITCH,
    });
  }

  return 'speech';
}
