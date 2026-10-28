import { createContext, useContext, type ReactNode } from 'react';

import type { AudioPreference } from './select';

const AudioPreferenceContext = createContext<AudioPreference>('es');

/** Screens outside the provider stay on Spain (es-ES). */
export function AudioPreferenceFrame({
  preference,
  children,
}: {
  preference: AudioPreference;
  children: ReactNode;
}) {
  return (
    <AudioPreferenceContext.Provider value={preference}>{children}</AudioPreferenceContext.Provider>
  );
}

export function useAudioPreference(): AudioPreference {
  return useContext(AudioPreferenceContext);
}
