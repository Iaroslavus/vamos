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
export function useIntroPlayback(
  item: Item,
  audioVariant: AudioPreference,
  line?: { es: string; audio: string | null; slow: string | null },
) {
  const text = line?.es ?? item.es;
  const normalAudio = line ? line.audio : itemAudioPath(item, audioVariant, 'normal');
  const slowAudio = line ? line.slow : itemAudioPath(item, audioVariant, 'slow');

  useEffect(() => {
    void playLessonAudio({ audio: normalAudio, text, rate: NORMAL_RATE });
    return () => {
      void stopLessonAudio();
    };
  }, [normalAudio, text, item.id]);

  const playPhrase = useCallback(
    (rate: number) => {
      const speed: AudioSpeed = rate < 1 ? 'slow' : 'normal';
      void playLessonAudio({
        audio: speed === 'slow' ? slowAudio : normalAudio,
        text,
        rate: speed === 'slow' ? SLOW_RATE : NORMAL_RATE,
      });
    },
    [normalAudio, slowAudio, text],
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
