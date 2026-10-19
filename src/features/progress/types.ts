export type LessonStatus = 'in_progress' | 'completed';

export type LessonProgress = {
  lessonId: string;
  status: LessonStatus;
  bestAccuracy: number | null;
  completedAt: string | null;
};

export type XpAward = {
  clientId: string;
  lessonId: string;
  amount: number;
  createdAt: string;
};

export type OutboxItem = {
  kind: 'lesson' | 'xp';
  key: string;
  attempts: number;
};

export type PersistedProgress = {
  version: 1;
  lessons: Record<string, LessonProgress>;
  xp: XpAward[];
  outbox: OutboxItem[];
};

export type ProgressSnapshot = {
  lessons: LessonProgress[];
  totalXp: number;
  pending: number;
};

export type CompletionInput = {
  lessonId: string;
  accuracy: number;
  xp: number;
  completedAt?: string;
  /** Stable id for this award. Reusing it on retry must not add XP again. */
  xpClientId?: string;
};

export type RemoteXp = {
  serverId: string;
  clientId: string | null;
  lessonId: string | null;
  amount: number;
  createdAt: string;
};

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type NetworkMonitor = {
  isOnline(): Promise<boolean>;
  subscribe(listener: (online: boolean) => void): () => void;
};

export type ProgressRemote = {
  fetchLessons(userId: string): Promise<LessonProgress[]>;
  fetchXp(userId: string): Promise<RemoteXp[]>;
  /** Returns the row after best-accuracy conflict resolution. */
  saveLesson(userId: string, lesson: LessonProgress): Promise<LessonProgress>;
  /** Inserts the award once per clientId. */
  insertXp(userId: string, award: XpAward): Promise<void>;
};

export type Scheduler = (fn: () => void, delayMs: number) => () => void;

export type ProgressRepository = {
  readProgress(userId: string): Promise<ProgressSnapshot>;
  recordCompletion(userId: string, input: CompletionInput): Promise<ProgressSnapshot>;
  sync(userId: string): Promise<ProgressSnapshot>;
  start(userId: string, onSynced: () => void): () => void;
  settled(): Promise<void>;
};
