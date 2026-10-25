import type { FolderColor, SystemKey } from './model';

export type { FolderColor, SystemKey };

export type FolderKind = 'system' | 'custom';

export type Folder = {
  id: string;
  name: string;
  color: FolderColor;
  kind: FolderKind;
  topicId: string | null;
  systemKey: SystemKey | null;
  createdAt: string;
};

export type FolderItem = {
  folderId: string;
  itemId: string;
  addedAt: string;
};

export type FolderSnapshot = {
  folders: Folder[];
  items: FolderItem[];
  pending: number;
};

export type DerivedInput = {
  topics: readonly { topicId: string; name: string; itemIds: readonly string[] }[];
  difficultItemIds: readonly string[];
};

export type FolderDraft = {
  name: string;
  color: FolderColor;
};

export type OutboxKind = 'folder' | 'item-add' | 'item-remove';

export type OutboxItem = {
  kind: OutboxKind;
  key: string;
  attempts: number;
};

export type PersistedFolders = {
  version: 1;
  folders: Record<string, Folder>;
  items: Record<string, FolderItem>;
  outbox: OutboxItem[];
  favoritesMigrated: boolean;
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

export type VocabRemote = {
  fetchFolders(userId: string): Promise<Folder[]>;
  fetchItems(userId: string): Promise<FolderItem[]>;
  upsertFolder(userId: string, folder: Folder): Promise<Folder>;
  insertItem(userId: string, item: FolderItem): Promise<void>;
  deleteItem(userId: string, folderId: string, itemId: string): Promise<void>;
};

export type Scheduler = (fn: () => void, delayMs: number) => () => void;

export type VocabRepository = {
  read(userId: string): Promise<FolderSnapshot>;
  /** Creates Избранное and Сложные and copies the old local favorites once. */
  ensureBases(userId: string): Promise<FolderSnapshot>;
  /**
   * Ensures the system folders, replaces Сложные with `difficultItemIds`,
   * and creates a topic folder the first time that topic is passed.
   */
  syncDerived(userId: string, input: DerivedInput): Promise<FolderSnapshot>;
  createFolder(userId: string, input: FolderDraft): Promise<FolderSnapshot>;
  updateFolder(userId: string, folderId: string, input: FolderDraft): Promise<FolderSnapshot>;
  addItems(userId: string, folderId: string, itemIds: readonly string[]): Promise<FolderSnapshot>;
  removeItem(userId: string, folderId: string, itemId: string): Promise<FolderSnapshot>;
  moveItem(
    userId: string,
    input: { itemId: string; fromId: string; toId: string },
  ): Promise<FolderSnapshot>;
  sync(userId: string): Promise<FolderSnapshot>;
  start(userId: string, onSynced: () => void): () => void;
  settled(): Promise<void>;
};
