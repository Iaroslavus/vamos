import { ACOUSTIC } from './config';

import type { FeatureMatrix } from './mfcc';

function squaredDistance(left: ArrayLike<number>, right: ArrayLike<number>): number {
  const width = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < width; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    sum += delta * delta;
  }
  return sum;
}

/**
 * Average DTW cost per step. A time shift or an even stretch stays cheap
 * because the path can wait on a repeated frame.
 * An empty sequence has infinite cost.
 */
export function dtwAverageCost(
  left: FeatureMatrix,
  right: FeatureMatrix,
  band = ACOUSTIC.dtwBand,
): number {
  const rowCount = left.length;
  const columnCount = right.length;
  if (rowCount === 0 || columnCount === 0) return Number.POSITIVE_INFINITY;
  const span = Math.max(rowCount, columnCount);
  const window = Math.max(Math.abs(rowCount - columnCount), Math.ceil(band * span));
  const infinity = Number.POSITIVE_INFINITY;
  let previous = new Float64Array(columnCount + 1).fill(infinity);
  let current = new Float64Array(columnCount + 1).fill(infinity);
  previous[0] = 0;

  for (let row = 1; row <= rowCount; row += 1) {
    current.fill(infinity);
    const center = Math.round((row * columnCount) / rowCount);
    const from = Math.max(1, center - window);
    const to = Math.min(columnCount, center + window);
    const frame = left[row - 1];
    if (!frame) continue;
    for (let column = from; column <= to; column += 1) {
      const other = right[column - 1];
      if (!other) continue;
      const cost = squaredDistance(frame, other);
      const diagonal = previous[column - 1] ?? infinity;
      const up = previous[column] ?? infinity;
      const leftCost = current[column - 1] ?? infinity;
      current[column] = cost + Math.min(diagonal, up, leftCost);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }

  const total = previous[columnCount] ?? infinity;
  if (!Number.isFinite(total)) return infinity;
  return total / (rowCount + columnCount);
}

/** 0–100. Identical sequences are 100. A large average cost falls toward 0. */
export function dtwSimilarity(
  left: FeatureMatrix,
  right: FeatureMatrix,
  band = ACOUSTIC.dtwBand,
): number {
  const average = dtwAverageCost(left, right, band);
  if (!Number.isFinite(average)) return 0;
  if (average <= 0) return 100;
  const similarity = 100 * Math.exp(-average / ACOUSTIC.dtwScale);
  return Math.max(0, Math.min(100, Math.round(similarity)));
}

/** Best similarity against every reference. An empty list is 0. */
export function bestSimilarity(live: FeatureMatrix, references: readonly FeatureMatrix[]): number {
  let best = 0;
  for (const reference of references) {
    const similarity = dtwSimilarity(live, reference);
    if (similarity > best) best = similarity;
  }
  return best;
}
