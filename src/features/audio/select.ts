import type { Audio, AudioTrack, Item, Variant } from '@/features/content/schema';

/** Spain (`es-ES`) or Latin America (`es-MX`) — the profile's spanish variant maps onto this. */
export type AudioPreference = 'es' | 'latam';

export type AudioSpeed = 'normal' | 'slow';

export type AudioGap = {
  /** Null is the whole phrase. A number is `parts[index]`. */
  part: number | null;
  voice: AudioPreference;
  speed: AudioSpeed;
};

type TrackLike = Pick<AudioTrack, 'es' | 'latam' | 'slow'>;

const SPEEDS: readonly AudioSpeed[] = ['normal', 'slow'];

/** Voices a unit needs. `both` is Spain and Latin America; a marked variant is only that voice. */
export function voicesForVariant(variant: Variant): AudioPreference[] {
  if (variant === 'es') return ['es'];
  if (variant === 'latam') return ['latam'];
  return ['es', 'latam'];
}

/** `spain` in the profile is the es-ES recording. Anything else stays on Spain. */
export function audioPreferenceFromVariant(variant: string | null | undefined): AudioPreference {
  return variant === 'latam' ? 'latam' : 'es';
}

/**
 * A clip the app can fetch.
 * Legacy bundled names such as `a1/hola.mp3` are not storage objects.
 */
export function isStoredAudioPath(path: string | null | undefined): path is string {
  if (!path) return false;
  return path.startsWith('items/') || path.startsWith('http://') || path.startsWith('https://');
}

function trackPath(track: TrackLike, voice: AudioPreference, speed: AudioSpeed): string | null {
  const pair = speed === 'slow' ? track.slow : track;
  return pair[voice] ?? null;
}

/**
 * File for this voice and speed.
 * The other region is the fallback. A missing slow file stays missing:
 * the player speaks it instead of slowing the normal file down.
 */
export function selectClip(
  audio: Audio,
  preference: AudioPreference = 'es',
  speed: AudioSpeed = 'normal',
  partIndex?: number,
): string | null {
  const track = partIndex === undefined ? audio : audio.parts[partIndex];
  if (!track) return null;
  const order: readonly AudioPreference[] =
    preference === 'latam' ? ['latam', 'es'] : ['es', 'latam'];
  for (const voice of order) {
    const path = trackPath(track, voice, speed);
    if (path) return path;
  }
  return null;
}

/** Clips this unit still needs before every required voice and speed exists in Storage. */
export function audioGaps(item: Item): AudioGap[] {
  const gaps: AudioGap[] = [];
  const voices = voicesForVariant(item.variant);
  const slots: (number | null)[] = [null, ...item.parts.map((_, index) => index)];
  for (const part of slots) {
    for (const voice of voices) {
      for (const speed of SPEEDS) {
        const track = part === null ? item.audio : item.audio.parts[part];
        const path = track ? trackPath(track, voice, speed) : null;
        if (!isStoredAudioPath(path)) gaps.push({ part, voice, speed });
      }
    }
  }
  return gaps;
}

export function formatAudioGap(gap: AudioGap): string {
  const where = gap.part === null ? 'фраза' : `часть ${gap.part + 1}`;
  const voice = gap.voice === 'es' ? 'es-ES' : 'es-MX';
  const speed = gap.speed === 'slow' ? 'медленно' : 'обычно';
  return `${where}, ${voice}, ${speed}`;
}
