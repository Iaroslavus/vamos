import { useCallback, useEffect } from 'react';

import { NORMAL_RATE, playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import type { Item } from '@/features/content/schema';

import { itemAudioPath, type AudioPreference } from '../intro';

/** Plays the phrase when the card appears, plus listen / slow / part taps. */
export function useIntroPlayback(item: Item, audioVariant: AudioPreference) {
  const audioPath = itemAudioPath(item, audioVariant);

  useEffect(() => {
    void playLessonAudio({ audio: audioPath, text: item.es, rate: NORMAL_RATE });
    return () => {
      void stopLessonAudio();
    };
  }, [audioPath, item.es, item.id]);

  const playPhrase = useCallback(
    (rate: number) => {
      void playLessonAudio({ audio: audioPath, text: item.es, rate });
    },
    [audioPath, item.es],
  );

  const playPart = useCallback((part: { es: string }) => {
    void playLessonAudio({ text: part.es, rate: NORMAL_RATE });
  }, []);

  return { playPhrase, playPart };
}
