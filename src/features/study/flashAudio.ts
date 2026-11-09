import { NORMAL_RATE, SLOW_RATE, play, playLessonAudio } from '@/features/audio/playback';
import type { AudioPreference, AudioSpeed } from '@/features/audio/select';
import { getItem } from '@/features/content/loader';

import type { StudyFlashcardStep } from './types';

/** Plays the Spanish phrase. A missing clip falls back to device speech. */
export function playFlashPhrase(
  step: Pick<StudyFlashcardStep, 'itemId' | 'phraseEs' | 'audio'>,
  speed: AudioSpeed,
  preference: AudioPreference,
): void {
  void speak(step, speed, preference);
}

async function speak(
  step: Pick<StudyFlashcardStep, 'itemId' | 'phraseEs' | 'audio'>,
  speed: AudioSpeed,
  preference: AudioPreference,
): Promise<void> {
  try {
    await play(getItem(step.itemId), speed, preference);
  } catch {
    try {
      await playLessonAudio({
        text: step.phraseEs,
        audio: speed === 'normal' ? step.audio : null,
        rate: speed === 'slow' ? SLOW_RATE : NORMAL_RATE,
      });
    } catch {
      // Speech can fail when playback is interrupted. The buttons stay usable.
    }
  }
}
