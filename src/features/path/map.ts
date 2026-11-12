export type PathNodeStatus = 'done' | 'current' | 'open' | 'chest';
export type PathNodeKind = 'topic' | 'chest';
export type PathAction = 'continue' | 'start' | 'repeat' | 'try';
export type HeroLine = 'vamos' | 'known' | 'shortcut' | 'challenge' | 'done';

export type PathTopic = {
  id: string;
  lessonIds: readonly string[];
  day: number | null;
};

export type PathModule = {
  id: string;
  level: string;
  week: number;
  checkpointId: string | null;
  chestLessonIds: readonly string[];
  topics: readonly PathTopic[];
};

export type PathPlan = {
  modules: readonly PathModule[];
};

export type PathProgress = {
  completedLessonIds: readonly string[];
};

export type PathNode = {
  id: string;
  kind: PathNodeKind;
  status: PathNodeStatus;
  moduleId: string;
  level: string;
  week: number;
  day: number | null;
  topicId: string | null;
  checkpointId: string | null;
  lessonIds: readonly string[];
  completedLessons: number;
  nextLessonId: string | null;
  nextLessonNumber: number | null;
};

export type PathSnapshot = {
  id: string;
  kind: PathNodeKind;
  status: PathNodeStatus;
  completedLessons: number;
};

type Draft = Omit<PathNode, 'status'>;

/** Nodes in course order. Nothing is locked: every topic stays startable. */
export function buildPath(plan: PathPlan, progress: PathProgress): PathNode[] {
  const completed = new Set(progress.completedLessonIds);
  const drafts: Draft[] = [];

  for (const module of plan.modules) {
    for (const topic of module.topics) {
      drafts.push(topicDraft(module, topic, completed));
    }
    if (module.checkpointId) {
      drafts.push(chestDraft(module, completed));
    }
  }

  const currentId =
    drafts.find((node) => node.kind === 'topic' && !topicFinished(node))?.id ?? null;

  return drafts.map((node) => ({
    ...node,
    status: statusOf(node, currentId),
  }));
}

export function initialNodeId(nodes: readonly PathNode[]): string | null {
  const current = nodes.find((node) => node.status === 'current');
  if (current) return current.id;
  const lastTopic = [...nodes].reverse().find((node) => node.kind === 'topic');
  return lastTopic?.id ?? nodes[0]?.id ?? null;
}

export function pathAction(node: PathNode): PathAction {
  if (node.kind === 'chest') return 'try';
  if (node.status === 'done') return 'repeat';
  if (node.completedLessons > 0) return 'continue';
  return 'start';
}

/** Lesson the primary button opens. Done and empty chests fall back to the first lesson. */
export function lessonToOpen(node: PathNode): string | null {
  if (node.lessonIds.length === 0) return null;
  if (node.status === 'done') return node.lessonIds[0] ?? null;
  return node.nextLessonId ?? node.lessonIds[0] ?? null;
}

export function heroLine(status: PathNodeStatus, topicJustFinished: boolean): HeroLine {
  if (topicJustFinished) return 'done';
  if (status === 'done') return 'known';
  if (status === 'open') return 'shortcut';
  if (status === 'chest') return 'challenge';
  return 'vamos';
}

/**
 * What just changed between two path snapshots.
 * A null previous snapshot is the first paint and never celebrates.
 */
export function pathCelebration(
  previous: readonly PathSnapshot[] | null,
  next: readonly PathSnapshot[],
): 'lesson' | 'topic' | null {
  if (previous === null || previous.length === 0) return null;
  const before = new Map(previous.map((node) => [node.id, node]));
  let lesson = false;

  for (const node of next) {
    const prior = before.get(node.id);
    if (!prior) continue;
    if (node.kind === 'topic' && node.status === 'done' && prior.status !== 'done') {
      return 'topic';
    }
    if (node.completedLessons > prior.completedLessons) lesson = true;
  }

  return lesson ? 'lesson' : null;
}

export function snapshotOf(nodes: readonly PathNode[]): PathSnapshot[] {
  return nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    status: node.status,
    completedLessons: node.completedLessons,
  }));
}

function statusOf(node: Draft, currentId: string | null): PathNodeStatus {
  if (node.kind === 'chest') return 'chest';
  if (topicFinished(node)) return 'done';
  if (node.id === currentId) return 'current';
  return 'open';
}

function topicFinished(node: Draft): boolean {
  return node.lessonIds.length > 0 && node.completedLessons === node.lessonIds.length;
}

function topicDraft(module: PathModule, topic: PathTopic, completed: ReadonlySet<string>): Draft {
  return {
    id: topic.id,
    kind: 'topic',
    moduleId: module.id,
    level: module.level,
    week: module.week,
    day: topic.day,
    topicId: topic.id,
    checkpointId: null,
    ...counts(topic.lessonIds, completed),
  };
}

function chestDraft(module: PathModule, completed: ReadonlySet<string>): Draft {
  const checkpointId = module.checkpointId ?? '';
  return {
    id: `chest:${checkpointId}`,
    kind: 'chest',
    moduleId: module.id,
    level: module.level,
    week: module.week,
    day: null,
    topicId: null,
    checkpointId,
    ...counts(module.chestLessonIds, completed),
  };
}

function counts(lessonIds: readonly string[], completed: ReadonlySet<string>) {
  const completedLessons = lessonIds.filter((id) => completed.has(id)).length;
  const nextIndex = lessonIds.findIndex((id) => !completed.has(id));
  return {
    lessonIds,
    completedLessons,
    nextLessonId: nextIndex === -1 ? null : (lessonIds[nextIndex] ?? null),
    nextLessonNumber: nextIndex === -1 ? null : nextIndex + 1,
  };
}
