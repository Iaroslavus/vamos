/** Opens in a row before the profile setting turns the breakdown on. A skipped card resets the count. */
export const PHRASE_BREAKDOWN_OPENS = 3;

export type PhraseBreakdownMemory = {
  show: boolean;
  streak: number;
};

export function rememberOpen(memory: PhraseBreakdownMemory): PhraseBreakdownMemory {
  if (memory.show) return { show: true, streak: memory.streak };
  const streak = memory.streak + 1;
  if (streak >= PHRASE_BREAKDOWN_OPENS) return { show: true, streak: 0 };
  return { show: false, streak };
}

/** The learner left a card that had a breakdown without opening it. */
export function rememberSkip(memory: PhraseBreakdownMemory): PhraseBreakdownMemory {
  if (memory.show || memory.streak === 0) return { show: memory.show, streak: memory.streak };
  return { show: false, streak: 0 };
}

/** Profile switch. Turning it either way starts the streak over. */
export function phraseBreakdownFromSwitch(show: boolean): PhraseBreakdownMemory {
  return { show, streak: 0 };
}
