/** Reorders items from `index` onward. Earlier items stay put. */
export function shuffleFrom<T>(items: readonly T[], index: number, random: () => number): T[] {
  if (index < 0 || index >= items.length - 1) return [...items];
  const head = items.slice(0, index);
  const tail = [...items.slice(index)];
  for (let cursor = tail.length - 1; cursor > 0; cursor -= 1) {
    const swap = Math.floor(random() * (cursor + 1));
    const current = tail[cursor];
    tail[cursor] = tail[swap]!;
    tail[swap] = current!;
  }
  return [...head, ...tail];
}
