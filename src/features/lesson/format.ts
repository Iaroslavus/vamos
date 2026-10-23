/** Format elapsed milliseconds as m:ss. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatAccuracyPercent(accuracy: number): string {
  return `${Math.round(Math.min(1, Math.max(0, accuracy)) * 100)}%`;
}
