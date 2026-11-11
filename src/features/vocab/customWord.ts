import type { ReviewRepository } from '@/features/review/types';

import { foldPhrase } from './phraseSearch';
import type { UserItem, UserItemDraft, VocabRepository } from './types';

export const CUSTOM_ES_MAX = 80;
export const CUSTOM_TR_MAX = 120;
export const CUSTOM_NOTE_MAX = 240;

export type CustomWordIssue = 'empty-es' | 'empty-tr' | 'too-long' | 'duplicate';

export type ParsedCustomWord = {
  es: string;
  tr: string;
  note: string | null;
};

type ExistingWord = {
  id: string;
  es: string;
};

export function parseCustomWord(
  input: UserItemDraft,
  existing: readonly ExistingWord[],
  exceptId?: string,
): { ok: true; value: ParsedCustomWord } | { ok: false; issue: CustomWordIssue } {
  const es = input.es.trim();
  const tr = input.tr.trim();
  const note = input.note.trim();
  if (es.length < 1) return { ok: false, issue: 'empty-es' };
  if (tr.length < 1) return { ok: false, issue: 'empty-tr' };
  if (es.length > CUSTOM_ES_MAX || tr.length > CUSTOM_TR_MAX || note.length > CUSTOM_NOTE_MAX) {
    return { ok: false, issue: 'too-long' };
  }
  const folded = foldPhrase(es);
  const duplicate = existing.some((item) => item.id !== exceptId && foldPhrase(item.es) === folded);
  if (duplicate) return { ok: false, issue: 'duplicate' };
  return { ok: true, value: { es, tr, note: note.length > 0 ? note : null } };
}

export function withCustomWords<T extends { id: string }>(
  words: readonly T[],
  custom: readonly UserItem[],
  toWord: (item: UserItem) => T,
): T[] {
  const seen = new Set(words.map((word) => word.id));
  return [...words, ...custom.filter((item) => !seen.has(item.id)).map(toWord)];
}

export function customWordIssueKey(issue: CustomWordIssue): string {
  switch (issue) {
    case 'empty-es':
      return 'customWords.emptyEs';
    case 'empty-tr':
      return 'customWords.emptyTr';
    case 'too-long':
      return 'customWords.tooLong';
    case 'duplicate':
      return 'customWords.duplicate';
    default: {
      const exhaustive: never = issue;
      return exhaustive;
    }
  }
}

type WordSaver = Pick<VocabRepository, 'addUserItem' | 'updateUserItem' | 'deleteUserItem'>;
type CardSaver = Pick<ReviewRepository, 'introduceItems' | 'forgetItems'>;

/** Saves the word in the folder and opens the same recognition card a lesson would. */
export async function saveCustomWord(
  vocab: WordSaver,
  review: Pick<CardSaver, 'introduceItems'>,
  userId: string,
  folderId: string,
  draft: UserItemDraft,
  existing: readonly ExistingWord[],
): Promise<UserItem> {
  const parsed = parseCustomWord(draft, existing);
  if (!parsed.ok) throw new Error(parsed.issue);
  const { item } = await vocab.addUserItem(userId, folderId, parsed.value);
  await review.introduceItems(userId, [{ id: item.id }]);
  return item;
}

export async function updateCustomWord(
  vocab: WordSaver,
  userId: string,
  itemId: string,
  draft: UserItemDraft,
  existing: readonly ExistingWord[],
): Promise<void> {
  const parsed = parseCustomWord(draft, existing, itemId);
  if (!parsed.ok) throw new Error(parsed.issue);
  await vocab.updateUserItem(userId, itemId, parsed.value);
}

/** Removes the word, every folder row, and its FSRS cards. */
export async function deleteCustomWord(
  vocab: WordSaver,
  review: Pick<CardSaver, 'forgetItems'>,
  userId: string,
  itemId: string,
): Promise<void> {
  await vocab.deleteUserItem(userId, itemId);
  await review.forgetItems(userId, [itemId]);
}
