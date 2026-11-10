export function pairsRecordKey(userId: string, folderId: string): string {
  return `vamos.study.pairs.${userId}.${folderId}`;
}

/** Best full-board time in milliseconds. Anything else is "no record". */
export function parsePairsRecord(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const ms = (parsed as { ms?: unknown }).ms;
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null;
    return Math.floor(ms);
  } catch {
    return null;
  }
}

export function serializePairsRecord(ms: number): string {
  return JSON.stringify({ ms: Math.max(0, Math.floor(ms)) });
}
