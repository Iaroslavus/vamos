import type { DialogLine, Item } from '@/features/content/schema';

import { normalizeForCompare } from './grading';

const SHORT = 3;

/** Polite formulas shared by almost every order, not a shared meaning. */
const STOP = new Set(['favor', 'please', 'пожалуйста', 'ласка', 'будь']);

function meaningWords(item: Item): Set<string> {
  const raw = [item.es, item.tr.ru, item.tr.uk, item.tr.en].join(' ');
  return new Set(
    normalizeForCompare(raw)
      .split(' ')
      .filter((word) => word.length > SHORT && word !== 'name' && !STOP.has(word)),
  );
}

/** «Me llamo {name}» and «Soy Ana» both answer “what is your name?”. */
function namesSomeone(item: Item): boolean {
  if (item.es.includes('{name}')) return true;
  const tokens = item.es.trim().split(/\s+/);
  return tokens.slice(1).some((token) => /^\p{Lu}/u.test(token.replace(/^[¿¡]+/u, '')));
}

/** True when this distractor could also be a fair reply. */
export function distractorFits(candidate: Item, accepts: readonly Item[]): boolean {
  if (namesSomeone(candidate) && accepts.some(namesSomeone)) return true;
  const words = meaningWords(candidate);
  return accepts.some((accept) => {
    for (const word of meaningWords(accept)) {
      if (words.has(word)) return true;
    }
    return false;
  });
}

/**
 * Distractors are not lines already used in this dialog, and not replies
 * that would also be acceptable. Every id in `accept` stays selectable.
 */
export function repairDialogLines(
  lines: readonly DialogLine[],
  pool: readonly Item[],
): DialogLine[] {
  const byId = new Map(pool.map((item) => [item.id, item]));
  const used = new Set<string>();

  return lines.map((line) => {
    if (line.who !== 'user') return line;
    const acceptItems = line.accept
      .map((id) => byId.get(id))
      .filter((item): item is Item => Boolean(item));
    const taken = new Set<string>(line.accept);

    const replacementFor = (): string | null => {
      for (const item of pool) {
        if (taken.has(item.id) || used.has(item.id)) continue;
        if (distractorFits(item, acceptItems)) continue;
        return item.id;
      }
      return null;
    };

    const options = [...line.accept];
    for (const id of line.options) {
      if (line.accept.includes(id)) continue;
      const item = byId.get(id);
      const fresh =
        item !== undefined && !taken.has(id) && !used.has(id) && !distractorFits(item, acceptItems);
      const next = fresh ? id : replacementFor();
      if (!next || taken.has(next)) continue;
      taken.add(next);
      options.push(next);
    }
    for (const id of line.accept) used.add(id);
    for (const id of options) used.add(id);
    return { ...line, options };
  });
}
