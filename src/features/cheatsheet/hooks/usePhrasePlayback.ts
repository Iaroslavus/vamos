import { useCallback, useEffect, useState } from 'react';

import { useAudioPreference } from '@/features/audio/preference';
import { NORMAL_RATE, playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import type { Item } from '@/features/content/schema';
import { itemAudioPath } from '@/features/lesson/intro';

/** Normal-speed phrase audio, the same player the intro card uses. */
export function usePhrasePlayback() {
  const preference = useAudioPreference();
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(
    () => () => {
      void stopLessonAudio();
    },
    [],
  );

  const play = useCallback(
    (item: Item) => {
      setPlayingId(item.id);
      void playLessonAudio({
        audio: itemAudioPath(item, preference, 'normal'),
        text: item.es,
        rate: NORMAL_RATE,
        onEnd: () => {
          setPlayingId((current) => (current === item.id ? null : current));
        },
      });
    },
    [preference],
  );

  const toggle = useCallback(
    (item: Item) => {
      if (playingId === item.id) {
        setPlayingId(null);
        void stopLessonAudio();
        return;
      }
      play(item);
    },
    [play, playingId],
  );

  return { playingId, play, toggle };
}
