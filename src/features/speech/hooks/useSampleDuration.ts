import { useEffect, useState } from 'react';

import { readSampleDurationMs } from '../sampleDuration';

/** Reference length for the recording cap. Null until a file reports one. */
export function useSampleDuration(audio: string | null): number | null {
  const [trackedAudio, setTrackedAudio] = useState(audio);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  if (trackedAudio !== audio) {
    setTrackedAudio(audio);
    setDurationMs(null);
  }

  useEffect(() => {
    let cancelled = false;
    void readSampleDurationMs(audio).then((ms) => {
      if (!cancelled) setDurationMs(ms);
    });
    return () => {
      cancelled = true;
    };
  }, [audio]);

  return durationMs;
}
