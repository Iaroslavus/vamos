import type { ReactNode } from 'react';

import { useLearnerProfile } from '@/features/learner/useLearnerProfile';

import { AudioPreferenceFrame } from './preference';
import { audioPreferenceFromVariant } from './select';

/** Lesson audio follows `profiles.spanish_variant`. */
export function AudioPreferenceProvider({ children }: { children: ReactNode }) {
  const profile = useLearnerProfile();
  return (
    <AudioPreferenceFrame preference={audioPreferenceFromVariant(profile.data?.spanishVariant)}>
      {children}
    </AudioPreferenceFrame>
  );
}
