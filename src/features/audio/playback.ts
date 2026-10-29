import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import * as Speech from 'expo-speech';

import { cachedAudioUri } from '@/features/audio/cache';
import { publicAudioUrl } from '@/features/audio/storage';
import type { Item } from '@/features/content/schema';
import { BUNDLED_AUDIO_ASSETS } from './assets';
import { selectClip, type AudioPreference, type AudioSpeed } from './select';
import { IOS_AV_SPEECH_DEFAULT_RATE, speechEngineRate } from './speechRate';

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
  /**
   * Fires when this playback finishes.
   * A newer `playLessonAudio` / `stopLessonAudio` cancels it.
   */
  onEnd?: () => void;
};

let activePlayer: AudioPlayer | null = null;
/** Monotonic token so overlapping play calls only keep the latest session. */
let playGeneration = 0;

function logPlayback(event: 'start' | 'done', fields: Record<string, string | number>): void {
  if (!__DEV__) return;
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  console.log(`[audio] ${event} ${body}`);
}

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

  // Storage object written by scripts/content/tts.ts. No project URL or no file yet → device TTS.
  if (audio.startsWith('items/')) {
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    if (!base) return null;
    return publicAudioUrl(audio, base);
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
 * Play a clip with expo-audio. The file is already normal or slow, so it plays at 1×.
 * expo-speech (es-ES) runs only when that file is missing or cannot be opened.
 */
export async function playLessonAudio({
  audio,
  text,
  rate = NORMAL_RATE,
  onEnd,
}: PlayLessonAudioInput): Promise<PlaybackSource> {
  const trimmed = text.trim();
  if (!trimmed && !audio) {
    onEnd?.();
    return 'speech';
  }

  // Bump generation inside stop so a newer call wins over an in-flight older one.
  await stopLessonAudio();
  const generation = playGeneration;

  const cached = audio && audio.startsWith('items/') ? await cachedAudioUri(audio) : null;
  const source = cached ?? resolveAudioSource(audio);
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
      // The file is already the right speed (normal, or slow via SSML).
      // Playing it at 1× keeps pitch and duration. Speech uses `rate` only
      // when no file could be opened.
      const startedAt = Date.now();
      logPlayback('start', {
        source: 'file',
        playbackRate: NORMAL_RATE,
        requestedRate: rate,
        setPlaybackRate: NORMAL_RATE,
        pitchCorrection: 'high',
        text: JSON.stringify(trimmed),
      });
      player.play();
      applyPlayerRate(player, NORMAL_RATE);
      if (typeof player.addListener === 'function') {
        const subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (!status.didJustFinish || generation !== playGeneration) return;
          subscription.remove();
          if (__DEV__) {
            logPlayback('done', {
              source: 'file',
              playbackRate: NORMAL_RATE,
              requestedRate: rate,
              durationMs: Date.now() - startedAt,
              text: JSON.stringify(trimmed),
            });
          }
          onEnd?.();
        });
      }
      return 'file';
    } catch {
      activePlayer = null;
      // Fall through to speech while TTS files / network are unavailable.
    }
  }

  if (trimmed && generation === playGeneration) {
    // Lessons ship content paths without bundled files, so this is the path
    // the Slow button actually runs. iOS compresses utterance.rate, so 0.7
    // must be mapped before it hits AVSpeechUtterance (pitch stays 1).
    const engineRate = speechEngineRate(rate);
    const nativeUtteranceRate = Number((engineRate * IOS_AV_SPEECH_DEFAULT_RATE).toFixed(3));
    logPlayback('start', {
      source: 'speech',
      playbackRate: rate,
      speechRate: Number(engineRate.toFixed(3)),
      nativeUtteranceRate,
      pitch: SPEECH_PITCH,
      language: SPEECH_LANGUAGE,
      text: JSON.stringify(trimmed),
    });
    const timing = { startedAt: 0 };
    Speech.speak(trimmed, {
      language: SPEECH_LANGUAGE,
      rate: engineRate,
      pitch: SPEECH_PITCH,
      onStart: () => {
        timing.startedAt = Date.now();
      },
      onDone: () => {
        if (generation !== playGeneration) return;
        if (timing.startedAt !== 0) {
          logPlayback('done', {
            source: 'speech',
            playbackRate: rate,
            speechRate: Number(engineRate.toFixed(3)),
            nativeUtteranceRate,
            durationMs: Date.now() - timing.startedAt,
            text: JSON.stringify(trimmed),
          });
        }
        onEnd?.();
      },
    });
    return 'speech';
  }

  if (generation === playGeneration) onEnd?.();
  return 'speech';
}

/**
 * Play one vocabulary item at normal or slow speed.
 * A stored clip for that voice and speed is a file. Anything else is device speech.
 */
export async function play(
  item: Pick<Item, 'es' | 'audio'>,
  speed: AudioSpeed = 'normal',
  preference: AudioPreference = 'es',
): Promise<PlaybackSource> {
  return playLessonAudio({
    text: item.es,
    audio: selectClip(item.audio, preference, speed),
    rate: speed === 'slow' ? SLOW_RATE : NORMAL_RATE,
  });
}
