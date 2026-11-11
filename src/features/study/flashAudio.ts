import type { AudioPreference, AudioSpeed } from '@/features/audio/select';

import { playUnit } from './playUnit';
import type { StudyFlashcardStep } from './types';

/** Plays the Spanish phrase. A learner's own word uses device speech. */
export function playFlashPhrase(
  step: Pick<StudyFlashcardStep, 'itemId' | 'phraseEs' | 'audio'>,
  speed: AudioSpeed,
  preference: AudioPreference,
): void {
  playUnit(step.itemId, step.phraseEs, preference, speed);
}
