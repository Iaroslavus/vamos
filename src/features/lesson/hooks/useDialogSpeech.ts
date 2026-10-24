import { useEffect, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';
import { useSpeechCapture } from '@/features/speech/hooks/useSpeechCapture';
import { SPEECH_MAX_ATTEMPTS } from '@/features/speech/options';
import { matchSpokenOption, type SpeechOption } from '@/features/speech/score';

export type DialogSpeechNotice = 'none' | 'miss' | 'denied';

type DialogSpeechTurn = {
  key: string;
  used: number;
  notice: DialogSpeechNotice;
};

export function useDialogSpeech(
  options: readonly SpeechOption[] | null,
  onMatch: (optionId: string) => void,
) {
  const optionsRef = useRef(options);
  const onMatchRef = useRef(onMatch);
  const armed = useRef(false);
  const lineKey = options?.map((option) => option.id).join('|') ?? '';
  const hints = options?.map((option) => option.es) ?? [];
  const [turn, setTurn] = useState<DialogSpeechTurn>({ key: lineKey, used: 0, notice: 'none' });

  if (turn.key !== lineKey) {
    setTurn({ key: lineKey, used: 0, notice: 'none' });
  }

  const used = turn.key === lineKey ? turn.used : 0;
  const notice = turn.key === lineKey ? turn.notice : 'none';

  useEffect(() => {
    optionsRef.current = options;
    onMatchRef.current = onMatch;
  }, [onMatch, options]);

  const capture = useSpeechCapture(hints, (text) => {
    if (!armed.current) return;
    armed.current = false;
    const current = optionsRef.current;
    if (!current) return;
    const match = matchSpokenOption(text, current);
    setTurn((prev) => {
      const base = prev.key === lineKey ? prev : { key: lineKey, used: 0, notice: 'none' as const };
      return {
        key: lineKey,
        used: Math.min(SPEECH_MAX_ATTEMPTS, base.used + 1),
        notice: match ? 'none' : 'miss',
      };
    });
    if (match) onMatchRef.current(match.id);
  });

  const { stop, listening } = capture;

  useEffect(() => {
    return () => {
      armed.current = false;
      stop();
    };
  }, [lineKey, stop]);

  const toggle = () => {
    if (!optionsRef.current) return;
    if (listening) {
      armed.current = false;
      stop();
      return;
    }
    if (used >= SPEECH_MAX_ATTEMPTS) return;
    armed.current = true;
    setTurn((prev) => ({
      key: lineKey,
      used: prev.key === lineKey ? prev.used : 0,
      notice: 'none',
    }));
    void stopLessonAudio();
    void capture.begin().then((started) => {
      if (started) return;
      armed.current = false;
      setTurn((prev) => ({
        key: lineKey,
        used: prev.key === lineKey ? prev.used : 0,
        notice: 'denied',
      }));
    });
  };

  return {
    listening,
    notice,
    disabled: used >= SPEECH_MAX_ATTEMPTS && !listening,
    toggle,
  };
}
