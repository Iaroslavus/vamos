import { useCallback, useEffect } from 'react';

import {
  NORMAL_RATE,
  SLOW_RATE,
  playLessonAudio,
  stopLessonAudio,
} from '@/features/audio/playback';
import type { Item } from '@/features/content/schema';

import { itemAudioPath, partAudioPath, type AudioPreference, type AudioSpeed } from '../intro';

/** Plays the phrase when the card appears, plus listen / slow / part taps. */
export function useIntroPlayback(item: Item, audioVariant: AudioPreference) {
  const audioPath = itemAudioPath(item, audioVariant, 'normal');

  useEffect(() => {
    void playLessonAudio({ audio: audioPath, text: item.es, rate: NORMAL_RATE });
    return () => {
      void stopLessonAudio();
    };
  }, [audioPath, item.es, item.id]);

  const playPhrase = useCallback(
    (rate: number) => {
      const speed: AudioSpeed = rate < 1 ? 'slow' : 'normal';
      void playLessonAudio({
        audio: itemAudioPath(item, audioVariant, speed),
        text: item.es,
        rate: speed === 'slow' ? SLOW_RATE : NORMAL_RATE,
      });
    },
    [audioVariant, item],
  );

  const playPart = useCallback(
    (part: { es: string }, index: number) => {
      void playLessonAudio({
        audio: partAudioPath(item, index, audioVariant, 'normal'),
        text: part.es,
        rate: NORMAL_RATE,
      });
    },
    [audioVariant, item],
  );

  return { playPhrase, playPart };
}
