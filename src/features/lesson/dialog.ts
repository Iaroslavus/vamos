import { fillName } from '@/features/content/gender';
import { contentLanguage } from '@/features/content/language';
import type { DialogLine, Item } from '@/features/content/schema';
import { textOf } from '@/features/content/text';

import type { AudioPreference } from './intro';
import { itemAudioPath } from './intro';

export type DialogOption = {
  id: string;
  es: string;
  ru: string;
  audio: string | null;
};

export type PlayableNpcLine = {
  who: 'npc';
  es: string;
  ru: string;
};

export type PlayableUserLine = {
  who: 'user';
  /** First accepted item. This is the line revealed after two misses. */
  targetId: string;
  /** Every option id that counts as this turn. */
  acceptIds: readonly string[];
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
  /** Gloss of the correct line while the second chance is open. */
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
  language: string | null | undefined = contentLanguage(),
  name: string | null = null,
): PlayableDialogLine[] {
  const speaker = name?.trim() || 'Ana';
  return lines.map((line) => {
    if (line.who === 'npc') return { who: 'npc', es: line.es, ru: textOf(line.tr, language) };
    const primaryId = line.accept[0];
    if (!primaryId) throw new Error('Dialog user line has no accepted item');
    const target = requiredItem(items, primaryId);
    const named = line.slot === 'name';
    const spoken = speakItem(target, named, speaker, preference, language);
    return {
      who: 'user',
      targetId: target.id,
      acceptIds: line.accept,
      es: spoken.es,
      ru: spoken.ru,
      audio: spoken.audio,
      options: line.options.map((id) => {
        const option = requiredItem(items, id);
        const lineSpoken = speakItem(option, named, speaker, preference, language);
        return { id: option.id, es: lineSpoken.es, ru: lineSpoken.ru, audio: lineSpoken.audio };
      }),
    };
  });
}

function speakItem(
  item: Item,
  named: boolean,
  speaker: string,
  preference: AudioPreference,
  language: string | null | undefined,
): { es: string; ru: string; audio: string | null } {
  const usesName = named || item.es.includes('{name}');
  const es = usesName ? fillName(item.es, speaker) : item.es;
  const ru = fillName(textOf(item.tr, language), speaker);
  const recorded = usesName ? fillName(item.es, 'Ana') : item.es;
  const audio =
    es.trim().toLowerCase() === recorded.trim().toLowerCase()
      ? itemAudioPath(item, preference)
      : null;
  return { es, ru, audio };
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

  const correct = line.acceptIds.includes(optionId);
  if (correct) {
    return sendLine(state, line, { missed: false, revealed: false, optionId });
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
  input: {
    missed: boolean;
    revealed: boolean;
    optionId?: string;
    rejectedIds?: readonly string[];
  },
): DialogState {
  const chosen =
    line.options.find((option) => option.id === input.optionId) ??
    line.options.find((option) => option.id === line.targetId);
  const outcome: DialogLineOutcome = {
    index: state.index,
    itemId: chosen?.id ?? line.targetId,
    es: chosen?.es ?? line.es,
    ru: chosen?.ru ?? line.ru,
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
    sendingEs: chosen?.es ?? line.es,
    sendingAudio: chosen?.audio ?? line.audio,
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
