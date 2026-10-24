import type { DialogLine, Item } from '@/features/content/schema';

import type { AudioPreference } from './intro';
import { itemAudioPath } from './intro';

export type DialogOption = {
  id: string;
  es: string;
};

export type PlayableNpcLine = {
  who: 'npc';
  es: string;
  ru: string;
};

export type PlayableUserLine = {
  who: 'user';
  targetId: string;
  es: string;
  ru: string;
  audio: string | null;
  options: readonly DialogOption[];
};

export type PlayableDialogLine = PlayableNpcLine | PlayableUserLine;

export type DialogPhase = 'listen' | 'choose' | 'send' | 'done';

/** One user line after it has been resolved (sent or revealed). */
export type DialogLineOutcome = {
  index: number;
  itemId: string;
  es: string;
  ru: string;
  options: readonly string[];
  /** True when the first tap missed. Still true if the second chance was right. */
  missed: boolean;
};

export type DialogState = {
  lines: readonly PlayableDialogLine[];
  index: number;
  phase: DialogPhase;
  /** How many lines are already in the transcript. Does not grow after `done`. */
  visibleCount: number;
  attempt: 1 | 2;
  rejectedIds: readonly string[];
  /** Russian of the correct line while the second chance is open. */
  hint: string | null;
  /** Increments on each first miss so the choice row can replay the shake. */
  shake: number;
  outcomes: readonly DialogLineOutcome[];
  sendingEs: string | null;
  sendingAudio: string | null;
  /** Both tries missed; the correct line is sent for them. */
  sendingRevealed: boolean;
};

export type DialogStepResult = {
  stepId: string;
  outcomes: readonly DialogLineOutcome[];
  missedItemIds: readonly string[];
};

const clearedTurn = {
  attempt: 1 as const,
  rejectedIds: [] as readonly string[],
  hint: null,
  sendingEs: null,
  sendingAudio: null,
  sendingRevealed: false,
};

export function indexDialogItems(items: readonly Item[]): ReadonlyMap<string, Item> {
  return new Map(items.map((item) => [item.id, item]));
}

export function resolveDialogLines(
  lines: readonly DialogLine[],
  items: ReadonlyMap<string, Item>,
  preference: AudioPreference = 'es',
): PlayableDialogLine[] {
  return lines.map((line) => {
    if (line.who === 'npc') return { who: 'npc', es: line.es, ru: line.ru };
    const target = requiredItem(items, line.target);
    return {
      who: 'user',
      targetId: target.id,
      es: target.es,
      ru: target.ru,
      audio: itemAudioPath(target, preference),
      options: line.options.map((id) => {
        const option = requiredItem(items, id);
        return { id: option.id, es: option.es };
      }),
    };
  });
}

export function createDialogState(lines: readonly PlayableDialogLine[]): DialogState {
  const first = lines[0];
  return {
    lines,
    index: 0,
    phase: !first ? 'done' : first.who === 'npc' ? 'listen' : 'choose',
    visibleCount: first?.who === 'npc' ? 1 : 0,
    shake: 0,
    outcomes: [],
    ...clearedTurn,
  };
}

/** NPC audio finished. Opens the next line. */
export function advanceNpc(state: DialogState): DialogState {
  const line = state.lines[state.index];
  if (state.phase !== 'listen' || line?.who !== 'npc') return state;
  return goNext(state);
}

/** Sent-line audio finished. Opens the next line. */
export function advanceSend(state: DialogState): DialogState {
  if (state.phase !== 'send') return state;
  return goNext(state);
}

/** Stop the script without revealing lines that have not been reached. */
export function endDialog(state: DialogState): DialogState {
  if (state.phase === 'done') return state;
  return { ...state, phase: 'done', hint: null };
}

export function chooseDialogOption(state: DialogState, optionId: string): DialogState {
  const line = state.lines[state.index];
  if (state.phase !== 'choose' || line?.who !== 'user') return state;
  if (state.rejectedIds.includes(optionId)) return state;
  if (!line.options.some((option) => option.id === optionId)) return state;

  const correct = optionId === line.targetId;
  if (correct) {
    return sendLine(state, line, { missed: state.attempt === 2, revealed: false });
  }
  if (state.attempt === 1) {
    return {
      ...state,
      attempt: 2,
      rejectedIds: [...state.rejectedIds, optionId],
      hint: line.ru,
      shake: state.shake + 1,
    };
  }
  return sendLine(state, line, {
    missed: true,
    revealed: true,
    rejectedIds: [...state.rejectedIds, optionId],
  });
}

export function dialogResult(stepId: string, state: DialogState): DialogStepResult {
  return {
    stepId,
    outcomes: state.outcomes,
    missedItemIds: state.outcomes
      .filter((outcome) => outcome.missed)
      .map((outcome) => outcome.itemId),
  };
}

function sendLine(
  state: DialogState,
  line: PlayableUserLine,
  input: { missed: boolean; revealed: boolean; rejectedIds?: readonly string[] },
): DialogState {
  const outcome: DialogLineOutcome = {
    index: state.index,
    itemId: line.targetId,
    es: line.es,
    ru: line.ru,
    options: line.options.map((option) => option.es),
    missed: input.missed,
  };
  return {
    ...state,
    phase: 'send',
    visibleCount: state.index + 1,
    hint: null,
    rejectedIds: input.rejectedIds ?? state.rejectedIds,
    outcomes: [...state.outcomes, outcome],
    sendingEs: line.es,
    sendingAudio: line.audio,
    sendingRevealed: input.revealed,
  };
}

function goNext(state: DialogState): DialogState {
  const index = state.index + 1;
  const line = state.lines[index];
  if (!line) {
    return { ...state, index, phase: 'done', ...clearedTurn };
  }
  return {
    ...state,
    index,
    phase: line.who === 'npc' ? 'listen' : 'choose',
    visibleCount: line.who === 'npc' ? state.visibleCount + 1 : state.visibleCount,
    ...clearedTurn,
  };
}

function requiredItem(items: ReadonlyMap<string, Item>, id: string): Item {
  const item = items.get(id);
  if (!item) throw new Error(`Unknown dialog item: ${id}`);
  return item;
}
