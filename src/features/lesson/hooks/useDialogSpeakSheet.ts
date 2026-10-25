import { useState } from 'react';

import { SPEECH_MAX_ATTEMPTS } from '@/features/speech/options';

import type { DialogOption, PlayableUserLine } from '../dialog';

type SpeechSession = {
  key: string;
  used: number;
  open: boolean;
};

const NO_OPTIONS: readonly DialogOption[] = [];

/** Opens SpeakPractice for the current dialog line without resetting the try cap on close. */
export function useDialogSpeakSheet(line: PlayableUserLine | null) {
  const lineKey = line?.options.map((option) => option.id).join('|') ?? '';
  const [session, setSession] = useState<SpeechSession>({ key: lineKey, used: 0, open: false });

  if (session.key !== lineKey) {
    setSession({ key: lineKey, used: 0, open: false });
  }

  const current = session.key === lineKey ? session : { key: lineKey, used: 0, open: false };

  const openSheet = () => {
    if (!line || current.used >= SPEECH_MAX_ATTEMPTS) return;
    setSession({ key: lineKey, used: current.used, open: true });
  };

  const close = () => {
    setSession((prev) => ({
      key: lineKey,
      used: prev.key === lineKey ? prev.used : 0,
      open: false,
    }));
  };

  const onAttemptsUsed = (count: number) => {
    setSession({ key: lineKey, used: count, open: true });
  };

  return {
    open: current.open,
    used: current.used,
    disabled: current.used >= SPEECH_MAX_ATTEMPTS,
    openSheet,
    close,
    onAttemptsUsed,
    options: line?.options ?? NO_OPTIONS,
  };
}
