import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import * as playback from '@/features/audio/playback';

const DURATION_WAIT_MS = 700;

/**
 * Length of the reference clip, when a file can be opened.
 * Null keeps the recording cap at its maximum.
 */
export async function readSampleDurationMs(
  audio: string | null | undefined,
): Promise<number | null> {
  const resolve = playback.resolveAudioSource;
  const source = typeof resolve === 'function' ? resolve(audio) : null;
  if (!source) return null;

  let player: AudioPlayer | null = null;
  try {
    player = createAudioPlayer(source);
    const seconds = await waitForDuration(player);
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
    return Math.round(seconds * 1000);
  } catch {
    return null;
  } finally {
    try {
      player?.remove();
    } catch {
      // The player may already be released.
    }
  }
}

function knownDuration(player: AudioPlayer): number | null {
  const seconds = player.duration;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

function waitForDuration(player: AudioPlayer): Promise<number | null> {
  const ready = knownDuration(player);
  if (ready != null) return Promise.resolve(ready);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(seconds);
    };
    const timer = setTimeout(() => {
      finish(knownDuration(player));
    }, DURATION_WAIT_MS);
    const subscription =
      typeof player.addListener === 'function'
        ? player.addListener('playbackStatusUpdate', (status) => {
            if (status.duration > 0) finish(status.duration);
          })
        : null;
  });
}
