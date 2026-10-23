export const SPANISH_QUICK_SYMBOLS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'] as const;

export type TextSelection = {
  start: number;
  end: number;
};

/** Insert `symbol` at the current selection, returning the next value + caret. */
export function insertAtSelection(
  value: string,
  selection: TextSelection,
  symbol: string,
): { value: string; selection: TextSelection } {
  const start = Math.max(0, Math.min(selection.start, value.length));
  const end = Math.max(start, Math.min(selection.end, value.length));
  const next = `${value.slice(0, start)}${symbol}${value.slice(end)}`;
  const caret = start + symbol.length;
  return { value: next, selection: { start: caret, end: caret } };
}
