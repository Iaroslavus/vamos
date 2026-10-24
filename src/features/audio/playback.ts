import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import * as Speech from 'expo-speech';

import { BUNDLED_AUDIO_ASSETS } from './assets';
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
      // AVPlayer.rate is linear (0.7 = 0.7×). Apply after play so iOS writes
      // the live rate with pitch correction. This path is unused for lessons
      // until a bundled/remote file exists.
      const startedAt = Date.now();
      logPlayback('start', {
        source: 'file',
        playbackRate: rate,
        setPlaybackRate: rate,
        pitchCorrection: 'high',
        text: JSON.stringify(trimmed),
      });
      player.play();
      applyPlayerRate(player, rate);
      if (typeof player.addListener === 'function') {
        const subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (!status.didJustFinish || generation !== playGeneration) return;
          subscription.remove();
          if (__DEV__) {
            logPlayback('done', {
              source: 'file',
              playbackRate: rate,
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
