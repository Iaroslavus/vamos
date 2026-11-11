import { NORMAL_RATE, SLOW_RATE, play, playLessonAudio } from '@/features/audio/playback';
import { speechLocale, type AudioPreference, type AudioSpeed } from '@/features/audio/select';
import { getItem } from '@/features/content/loader';

/** Plays a course clip when one exists. A learner's own word uses device TTS. */
export function playUnit(
  itemId: string,
  es: string,
  preference: AudioPreference,
  speed: AudioSpeed = 'normal',
): void {
  try {
    void play(getItem(itemId), speed, preference);
  } catch {
    void playLessonAudio({
      text: es,
      rate: speed === 'slow' ? SLOW_RATE : NORMAL_RATE,
      language: speechLocale(preference),
    });
  }
}
