import { useEffect } from 'react';

import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';

/**
 * After a short-phrase attempt, play the learner's take and then the sample.
 * `token` 0 means there is nothing to play yet.
 */
export function useComparePlayback(
  token: number,
  recordingUri: string | null,
  sample: { audio: string | null; text: string },
): void {
  const { audio, text } = sample;

  useEffect(() => {
    if (token === 0) return;
    let cancelled = false;

    const playSample = () => {
      if (cancelled) return;
      void playLessonAudio({ audio, text });
    };

    if (recordingUri) {
      void playLessonAudio({ audio: recordingUri, text: '', onEnd: playSample });
    } else {
      playSample();
    }

    return () => {
      cancelled = true;
      void stopLessonAudio();
    };
  }, [audio, recordingUri, text, token]);
}
