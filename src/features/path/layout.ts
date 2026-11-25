import type { PathNodeStatus } from './map';

/**
 * X slots repeat every six topics, as a share of (width − 48) from a 24 pt inset.
 * Taken from the «v3 · Путь» board (390 pt wide): 96, 250, 300, 150, 80, 230.
 */
export const X_PATTERN = [0.21, 0.66, 0.81, 0.37, 0.16, 0.6] as const;

export const NODE_STEP = 96;
export const MAP_TOP = 120;
/**
 * Room under the lowest node so its circle and the two-line label sit above the card.
 * Current node is 74 pt; the label hangs below the centre by about half the node,
 * the 5 pt sole, and two lines of type.
 */
export const MAP_BOTTOM = 148;
export const WALK_MS = 700;

export const HERO_BOX_WIDTH = 76;
export const HERO_BOX_HEIGHT = 106;

export function nodeSize(status: PathNodeStatus): number {
  if (status === 'current') return 74;
  if (status === 'chest') return 62;
  if (status === 'done') return 60;
  return 58;
}

/**
 * Botas stands beside the node, never on it: to the right of nodes near the left edge,
 * to the left otherwise. Feet sit a little below the node centre, on the road.
 */
export function heroBox(x: number, y: number, width: number): { left: number; top: number } {
  const gap = 34;
  const left = x < width * 0.4 ? x + gap : x - gap - HERO_BOX_WIDTH;
  return { left, top: y + 18 - HERO_BOX_HEIGHT };
}

/** Decoration spot halfway to the next node, on the side away from the road. */
export function decorSpot(
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
): { left: number; top: number } {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const left = midX < width / 2 ? width - 76 : 12;
  return { left, top: midY - 32 };
}

export function mapHeight(count: number): number {
  if (count <= 0) return MAP_TOP + MAP_BOTTOM;
  return MAP_TOP + MAP_BOTTOM + (count - 1) * NODE_STEP;
}

/** Index 0 is the first topic and sits at the bottom of the scroll content. */
export function nodeAnchor(index: number, count: number, width: number): { x: number; y: number } {
  const span = Math.max(width - 48, 1);
  const slot = X_PATTERN[index % X_PATTERN.length] ?? 0.5;
  return {
    x: 24 + slot * span,
    y: mapHeight(count) - MAP_BOTTOM - index * NODE_STEP,
  };
}

export function scrollOffsetForNode(y: number, viewport: number): number {
  return Math.max(0, y - viewport * 0.42);
}

/**
 * Module of the node in the lower part of the viewport.
 * The path climbs upward, so the city you are standing in sits low on the screen.
 */
export function moduleAtScroll(
  nodes: readonly { moduleId: string; y: number }[],
  scrollY: number,
  viewport: number,
): string | null {
  const first = nodes[0];
  if (!first) return null;
  const focus = scrollY + Math.max(viewport - 72, 0);
  let best = first;
  let bestDist = Math.abs(first.y - focus);
  for (const node of nodes) {
    const dist = Math.abs(node.y - focus);
    if (dist < bestDist) {
      best = node;
      bestDist = dist;
    }
  }
  return best.moduleId;
}

export function smoothPath(points: readonly { x: number; y: number }[]): string {
  const first = points[0];
  if (!first) return '';
  let path = `M ${round(first.x)} ${round(first.y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return path;
}

/** Teal stretches: each step that leaves a finished node. */
export function doneTrack(
  points: readonly { x: number; y: number }[],
  statuses: readonly PathNodeStatus[],
): string {
  const parts: string[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (statuses[index] !== 'done') continue;
    const from = points[index];
    const to = points[index + 1];
    if (!from || !to) continue;
    parts.push(smoothPath([from, to]));
  }
  return parts.join(' ');
}

function round(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}
