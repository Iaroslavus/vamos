import { cleanItemId, isFolderColor, parseFolderName, parseLegacyFavoriteIds } from './model';
import { foldPhrase } from './phraseSearch';
import type {
  DerivedInput,
  Folder,
  FolderDraft,
  FolderItem,
  FolderSnapshot,
  KeyValueStorage,
  NetworkMonitor,
  OutboxItem,
  ParsedUserItem,
  PersistedFolders,
  Scheduler,
  SystemKey,
  UserItem,
  VocabRemote,
  VocabRepository,
} from './types';

const LEGACY_FAVORITES_KEY = 'vamos-favorites';

const SYSTEM_FOLDER: Record<SystemKey, { name: string; color: Folder['color'] }> = {
  favorites: { name: 'Избранное', color: 'saffron' },
  difficult: { name: 'Сложные', color: 'coral' },
};

export function vocabStorageKey(userId: string): string {
  return `vamos.vocab.local.${userId}`;
}

export function itemKey(folderId: string, itemId: string): string {
  return `${folderId}:${itemId}`;
}

export type VocabRepositoryDeps = {
  storage: KeyValueStorage;
  network: NetworkMonitor;
  remote: VocabRemote;
  now?: () => string;
  createId?: () => string;
  schedule?: Scheduler;
  readLegacyFavorites?: () => Promise<readonly string[]>;
};

export function createVocabRepository(deps: VocabRepositoryDeps): VocabRepository {
  const now = deps.now ?? (() => new Date().toISOString());
  const createId = deps.createId ?? randomId;
  const schedule = deps.schedule ?? defaultSchedule;
  const readLegacy =
    deps.readLegacyFavorites ??
    (async () => parseLegacyFavoriteIds(await deps.storage.getItem(LEGACY_FAVORITES_KEY)));

  let tail: Promise<void> = Promise.resolve();
  let retryAttempts = 0;
  let cancelRetry: (() => void) | null = null;
  const listeners = new Set<() => void>();

  function exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function scheduleRetry(task: () => Promise<void>): void {
    cancelRetry?.();
    retryAttempts += 1;
    const delay = retryDelayMs(retryAttempts);
    cancelRetry = schedule(() => {
      cancelRetry = null;
      void exclusive(task)
        .then(() => {
          retryAttempts = 0;
          emit();
        })
        .catch(() => {
          scheduleRetry(task);
        });
    }, delay);
  }

  async function load(userId: string): Promise<PersistedFolders> {
    const raw = await deps.storage.getItem(vocabStorageKey(userId));
    if (!raw) return emptyFolders();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Stored folders are unreadable');
    }
    if (!isPersisted(parsed)) throw new Error('Stored folders are unreadable');
    return {
      ...parsed,
      favoritesMigrated: parsed.favoritesMigrated === true,
      pinnedDifficult: cleanPins(parsed.pinnedDifficult),
      userItems: cleanUserItems(parsed.userItems),
      items: cleanFolderItems(parsed.items),
    };
  }

  async function save(userId: string, state: PersistedFolders): Promise<void> {
    await deps.storage.setItem(vocabStorageKey(userId), JSON.stringify(state));
  }

  async function tryFlush(userId: string): Promise<void> {
    if (!(await deps.network.isOnline())) return;
    try {
      await flush(userId);
    } catch {
      scheduleRetry(() => flush(userId));
    }
  }

  async function applyBases(userId: string): Promise<PersistedFolders> {
    let state = await load(userId);
    let changed = false;
    const createdAt = now();

    for (const key of ['favorites', 'difficult'] as const) {
      if (findSystem(state, key)) continue;
      const folder = makeSystem(key, createId(), createdAt);
      state = enqueue(putFolder(state, folder), { kind: 'folder', key: folder.id, attempts: 0 });
      changed = true;
    }

    if (!state.favoritesMigrated) {
      const favorites = findSystem(state, 'favorites');
      if (!favorites) throw new Error('Favorites folder is missing');
      for (const raw of await readLegacy()) {
        const itemId = cleanItemId(raw);
        if (!itemId) continue;
        state = addItem(state, favorites.id, itemId, createdAt).state;
      }
      state = { ...state, favoritesMigrated: true };
      changed = true;
    }

    if (changed) await save(userId, state);
    return state;
  }

  async function applyDerived(userId: string, input: DerivedInput): Promise<PersistedFolders> {
    let state = await applyBases(userId);
    let changed = false;
    const createdAt = now();
    const difficult = findSystem(state, 'difficult');
    if (!difficult) throw new Error('Difficult folder is missing');

    const wanted = new Set<string>();
    for (const raw of [...input.difficultItemIds, ...state.pinnedDifficult]) {
      const itemId = cleanItemId(raw);
      if (itemId) wanted.add(itemId);
    }

    for (const item of Object.values(state.items)) {
      if (item.folderId !== difficult.id || wanted.has(item.itemId)) continue;
      const removed = removeItem(state, difficult.id, item.itemId);
      state = removed.state;
      changed = changed || removed.changed;
    }
    for (const itemId of wanted) {
      const added = addItem(state, difficult.id, itemId, createdAt);
      state = added.state;
      changed = changed || added.changed;
    }

    for (const topic of input.topics) {
      const topicId = cleanItemId(topic.topicId);
      const name = parseFolderName(topic.name);
      if (!topicId || !name || findTopic(state, topicId)) continue;
      const folder: Folder = {
        id: createId(),
        name,
        color: 'teal',
        kind: 'system',
        topicId,
        systemKey: null,
        createdAt,
      };
      state = enqueue(putFolder(state, folder), { kind: 'folder', key: folder.id, attempts: 0 });
      changed = true;
      for (const raw of topic.itemIds) {
        const itemId = cleanItemId(raw);
        if (!itemId) continue;
        state = addItem(state, folder.id, itemId, createdAt).state;
      }
    }

    if (changed) await save(userId, state);
    return state;
  }

  async function pull(userId: string): Promise<void> {
    const [remoteFolders, remoteItems, remoteWords] = await Promise.all([
      deps.remote.fetchFolders(userId),
      deps.remote.fetchItems(userId),
      deps.remote.fetchUserItems(userId),
    ]);
    let state = await load(userId);
    for (const remote of remoteFolders) {
      const local = twin(state, remote);
      if (local && local.id !== remote.id) state = adoptFolderId(state, local.id, remote.id);
    }
    state = mergeRemote(state, remoteFolders, remoteItems, remoteWords);
    await save(userId, state);
  }

  async function flush(userId: string): Promise<void> {
    if (!(await deps.network.isOnline())) return;
    let state = await load(userId);
    const seen = new Set<string>();

    while (state.outbox.length > 0) {
      const item = state.outbox.find((entry) => !seen.has(outboxToken(entry)));
      if (!item) break;
      seen.add(outboxToken(item));
      try {
        if (item.kind === 'folder') state = await flushFolder(userId, state, item);
        else if (item.kind === 'folder-delete')
          state = await flushFolderDelete(userId, state, item);
        else if (item.kind === 'user-item') state = await flushUserItem(userId, state, item);
        else if (item.kind === 'user-item-delete')
          state = await flushUserItemDelete(userId, state, item);
        else if (item.kind === 'item-add') state = await flushAdd(userId, state, item);
        else state = await flushRemove(userId, state, item);
      } catch (error) {
        state = bump(state, item);
        await save(userId, state);
        throw error;
      }
    }
  }

  async function flushFolder(
    userId: string,
    state: PersistedFolders,
    item: OutboxItem,
  ): Promise<PersistedFolders> {
    const folder = state.folders[item.key];
    if (!folder) {
      state = without(state, item);
      await save(userId, state);
      return state;
    }
    const saved = await deps.remote.upsertFolder(userId, folder);
    if (saved.id !== folder.id) state = adoptFolderId(state, folder.id, saved.id);
    state = without(state, { kind: 'folder', key: folder.id, attempts: 0 });
    state = without(state, { kind: 'folder', key: saved.id, attempts: 0 });
    await save(userId, state);
    return state;
  }

  async function flushFolderDelete(
    userId: string,
    state: PersistedFolders,
    item: OutboxItem,
  ): Promise<PersistedFolders> {
    await deps.remote.deleteFolder(userId, item.key);
    state = without(state, item);
    await save(userId, state);
    return state;
  }

  async function flushAdd(
    userId: string,
    state: PersistedFolders,
    item: OutboxItem,
  ): Promise<PersistedFolders> {
    const entry = state.items[item.key];
    if (!entry) {
      state = without(state, item);
      await save(userId, state);
      return state;
    }
    await deps.remote.insertItem(userId, entry);
    state = without(state, item);
    await save(userId, state);
    return state;
  }

  async function flushUserItem(
    userId: string,
    state: PersistedFolders,
    item: OutboxItem,
  ): Promise<PersistedFolders> {
    const word = state.userItems[item.key];
    if (!word) {
      state = without(state, item);
      await save(userId, state);
      return state;
    }
    await deps.remote.upsertUserItem(userId, word);
    state = without(state, item);
    await save(userId, state);
    return state;
  }

  async function flushUserItemDelete(
    userId: string,
    state: PersistedFolders,
    item: OutboxItem,
  ): Promise<PersistedFolders> {
    await deps.remote.deleteUserItem(userId, item.key);
    state = without(state, item);
    await save(userId, state);
    return state;
  }

  async function flushRemove(
    userId: string,
    state: PersistedFolders,
    item: OutboxItem,
  ): Promise<PersistedFolders> {
    const parts = splitItemKey(item.key);
    if (!parts) {
      state = without(state, item);
      await save(userId, state);
      return state;
    }
    await deps.remote.deleteItem(userId, parts.folderId, parts.itemId);
    state = without(state, item);
    await save(userId, state);
    return state;
  }

  async function syncBody(userId: string): Promise<FolderSnapshot> {
    if (await deps.network.isOnline()) {
      await pull(userId);
      await flush(userId);
    }
    return toSnapshot(await load(userId));
  }

  function finish(userId: string, task: () => Promise<void>): Promise<FolderSnapshot> {
    return exclusive(async () => {
      assertUser(userId);
      await task();
      await tryFlush(userId);
      return toSnapshot(await load(userId));
    });
  }

  return {
    read(userId) {
      return exclusive(async () => {
        assertUser(userId);
        return toSnapshot(await load(userId));
      });
    },

    ensureBases(userId) {
      return finish(userId, () => applyBases(userId).then(() => undefined));
    },

    syncDerived(userId, input) {
      return finish(userId, () => applyDerived(userId, input).then(() => undefined));
    },

    createFolder(userId, input) {
      return finish(userId, async () => {
        const draft = requireDraft(input);
        let state = await applyBases(userId);
        const folder: Folder = {
          id: createId(),
          name: draft.name,
          color: draft.color,
          kind: 'custom',
          topicId: null,
          systemKey: null,
          createdAt: now(),
        };
        state = enqueue(putFolder(state, folder), { kind: 'folder', key: folder.id, attempts: 0 });
        await save(userId, state);
      });
    },

    updateFolder(userId, folderId, input) {
      return finish(userId, async () => {
        const draft = requireDraft(input);
        const state = await load(userId);
        const folder = state.folders[folderId];
        if (!folder) throw new Error('Unknown folder');
        if (folder.kind !== 'custom') throw new Error('System folder cannot be edited');
        if (folder.name === draft.name && folder.color === draft.color) return;
        await save(
          userId,
          enqueue(putFolder(state, { ...folder, name: draft.name, color: draft.color }), {
            kind: 'folder',
            key: folder.id,
            attempts: 0,
          }),
        );
      });
    },

    deleteFolder(userId, folderId) {
      return finish(userId, async () => {
        const state = await load(userId);
        const folder = state.folders[folderId];
        if (!folder) throw new Error('Unknown folder');
        if (folder.kind !== 'custom') throw new Error('System folder cannot be deleted');
        await save(userId, dropFolder(state, folderId));
      });
    },

    pinDifficult(userId, itemIds) {
      return finish(userId, async () => {
        const ids = uniqueItemIds(itemIds);
        if (ids.length === 0) return;
        let state = await applyBases(userId);
        const difficult = findSystem(state, 'difficult');
        if (!difficult) throw new Error('Difficult folder is missing');
        const addedAt = now();
        let changed = false;
        for (const itemId of ids) {
          const added = addItem(state, difficult.id, itemId, addedAt);
          state = added.state;
          changed = changed || added.changed;
        }
        const pinned = mergePins(state.pinnedDifficult, ids);
        if (pinned.length !== state.pinnedDifficult.length) {
          state = { ...state, pinnedDifficult: pinned };
          changed = true;
        }
        if (changed) await save(userId, state);
      });
    },

    addItems(userId, folderId, itemIds) {
      return finish(userId, async () => {
        let state = await load(userId);
        const folder = state.folders[folderId];
        if (!folder) throw new Error('Unknown folder');
        assertEditable(folder);
        const ids = uniqueItemIds(itemIds);
        let changed = false;
        const addedAt = now();
        for (const itemId of ids) {
          const added = addItem(state, folderId, itemId, addedAt);
          state = added.state;
          changed = changed || added.changed;
        }
        if (changed) await save(userId, state);
      });
    },

    removeItem(userId, folderId, itemId) {
      return finish(userId, async () => {
        const state = await load(userId);
        const folder = state.folders[folderId];
        if (!folder) throw new Error('Unknown folder');
        assertEditable(folder);
        const cleaned = cleanItemId(itemId);
        if (!cleaned) throw new Error('Invalid item id');
        const removed = removeItem(state, folderId, cleaned);
        if (!removed.changed) throw new Error('Item is not in the folder');
        await save(userId, removed.state);
      });
    },

    addUserItem(userId, folderId, input) {
      let created: UserItem | null = null;
      const snapshot = finish(userId, async () => {
        let state = await load(userId);
        const folder = state.folders[folderId];
        if (!folder) throw new Error('Unknown folder');
        assertEditable(folder);
        const word = requireUserItem(input);
        assertUniqueWord(state, word.es);
        const item: UserItem = {
          id: createId(),
          es: word.es,
          tr: word.tr,
          note: word.note,
          createdAt: now(),
        };
        state = enqueue(putUserItem(state, item), {
          kind: 'user-item',
          key: item.id,
          attempts: 0,
        });
        state = addItem(state, folderId, item.id, item.createdAt, item.id).state;
        await save(userId, state);
        created = item;
      });
      return snapshot.then((next) => {
        if (!created) throw new Error('Invalid custom word');
        return { snapshot: next, item: created };
      });
    },

    updateUserItem(userId, itemId, input) {
      return finish(userId, async () => {
        const word = requireUserItem(input);
        const state = await load(userId);
        const current = state.userItems[itemId];
        if (!current) throw new Error('Unknown word');
        assertUniqueWord(state, word.es, itemId);
        if (current.es === word.es && current.tr === word.tr && current.note === word.note) return;
        const next = putUserItem(state, { ...current, es: word.es, tr: word.tr, note: word.note });
        await save(userId, enqueue(next, { kind: 'user-item', key: itemId, attempts: 0 }));
      });
    },

    deleteUserItem(userId, itemId) {
      return finish(userId, async () => {
        const cleaned = cleanItemId(itemId);
        if (!cleaned) throw new Error('Invalid item id');
        const state = await load(userId);
        if (!state.userItems[cleaned]) throw new Error('Unknown word');
        await save(userId, dropUserItem(state, cleaned));
      });
    },

    moveItem(userId, input) {
      return finish(userId, async () => {
        if (input.fromId === input.toId) throw new Error('Unknown folder');
        let state = await load(userId);
        const from = state.folders[input.fromId];
        const to = state.folders[input.toId];
        if (!from || !to) throw new Error('Unknown folder');
        assertEditable(from);
        assertEditable(to);
        const itemId = cleanItemId(input.itemId);
        if (!itemId) throw new Error('Invalid item id');
        const previous = state.items[itemKey(from.id, itemId)];
        const removed = removeItem(state, from.id, itemId);
        if (!removed.changed) throw new Error('Item is not in the folder');
        state = addItem(removed.state, to.id, itemId, now(), previous?.userItemId ?? null).state;
        await save(userId, state);
      });
    },

    sync(userId) {
      return exclusive(async () => {
        assertUser(userId);
        try {
          return await syncBody(userId);
        } catch (error) {
          scheduleRetry(() => syncBody(userId).then(() => undefined));
          throw error;
        }
      });
    },

    start(userId, onSynced) {
      let stopped = false;
      listeners.add(onSynced);
      const run = () => {
        if (stopped) return;
        void exclusive(() => syncBody(userId))
          .then(() => {
            if (!stopped) onSynced();
          })
          .catch(() => {
            if (!stopped) scheduleRetry(() => syncBody(userId).then(() => undefined));
          });
      };
      const unsubscribe = deps.network.subscribe((online) => {
        if (online) run();
      });
      run();
      return () => {
        stopped = true;
        listeners.delete(onSynced);
        unsubscribe();
      };
    },

    settled() {
      return tail;
    },
  };
}

function emptyFolders(): PersistedFolders {
  return {
    version: 1,
    folders: {},
    items: {},
    userItems: {},
    outbox: [],
    favoritesMigrated: false,
    pinnedDifficult: [],
  };
}

function isPersisted(value: unknown): value is PersistedFolders {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as PersistedFolders;
  return (
    record.version === 1 &&
    typeof record.folders === 'object' &&
    record.folders !== null &&
    typeof record.items === 'object' &&
    record.items !== null &&
    Array.isArray(record.outbox) &&
    (record.favoritesMigrated === undefined || typeof record.favoritesMigrated === 'boolean')
  );
}

function toSnapshot(state: PersistedFolders): FolderSnapshot {
  const folders = Object.values(state.folders).sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );
  const items = Object.values(state.items).sort(
    (left, right) =>
      left.addedAt.localeCompare(right.addedAt) || left.itemId.localeCompare(right.itemId),
  );
  const userItems = Object.values(state.userItems).sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );
  return { folders, items, userItems, pending: state.outbox.length };
}

function makeSystem(key: SystemKey, id: string, createdAt: string): Folder {
  const spec = SYSTEM_FOLDER[key];
  return {
    id,
    name: spec.name,
    color: spec.color,
    kind: 'system',
    topicId: null,
    systemKey: key,
    createdAt,
  };
}

function findSystem(state: PersistedFolders, key: SystemKey): Folder | undefined {
  return Object.values(state.folders).find((folder) => folder.systemKey === key);
}

function findTopic(state: PersistedFolders, topicId: string): Folder | undefined {
  return Object.values(state.folders).find((folder) => folder.topicId === topicId);
}

function twin(state: PersistedFolders, remote: Folder): Folder | undefined {
  const byId = state.folders[remote.id];
  if (byId) return byId;
  if (remote.systemKey) return findSystem(state, remote.systemKey);
  if (remote.topicId) return findTopic(state, remote.topicId);
  return undefined;
}

function putFolder(state: PersistedFolders, folder: Folder): PersistedFolders {
  return { ...state, folders: { ...state.folders, [folder.id]: folder } };
}

function dropFolder(state: PersistedFolders, folderId: string): PersistedFolders {
  const folders = { ...state.folders };
  delete folders[folderId];
  const items: Record<string, FolderItem> = {};
  for (const [key, item] of Object.entries(state.items)) {
    if (item.folderId !== folderId) items[key] = item;
  }
  const prefix = `${folderId}:`;
  const outbox = state.outbox.filter((entry) => {
    if (entry.key === folderId && (entry.kind === 'folder' || entry.kind === 'folder-delete')) {
      return false;
    }
    if (entry.key.startsWith(prefix)) return false;
    return true;
  });
  let next = enqueue(
    { ...state, folders, items, outbox },
    { kind: 'folder-delete', key: folderId, attempts: 0 },
  );
  const kept = new Set(Object.values(next.items).map((item) => item.itemId));
  for (const word of Object.values(state.userItems)) {
    if (kept.has(word.id)) continue;
    next = dropUserItem(next, word.id);
  }
  return next;
}

function addItem(
  state: PersistedFolders,
  folderId: string,
  itemId: string,
  addedAt: string,
  userItemId: string | null = null,
): { state: PersistedFolders; changed: boolean } {
  const key = itemKey(folderId, itemId);
  if (state.items[key]) return { state, changed: false };
  const cancellingRemove = state.outbox.some(
    (entry) => entry.kind === 'item-remove' && entry.key === key,
  );
  let next: PersistedFolders = {
    ...state,
    items: { ...state.items, [key]: { folderId, itemId, addedAt, userItemId } },
    outbox: state.outbox.filter((entry) => !(entry.kind === 'item-remove' && entry.key === key)),
  };
  if (!cancellingRemove) next = enqueue(next, { kind: 'item-add', key, attempts: 0 });
  return { state: next, changed: true };
}

function removeItem(
  state: PersistedFolders,
  folderId: string,
  itemId: string,
): { state: PersistedFolders; changed: boolean } {
  const key = itemKey(folderId, itemId);
  const hadAdd = state.outbox.some((entry) => entry.kind === 'item-add' && entry.key === key);
  if (!state.items[key] && !hadAdd) return { state, changed: false };
  const items = { ...state.items };
  delete items[key];
  let next: PersistedFolders = {
    ...state,
    items,
    outbox: state.outbox.filter((entry) => !(entry.kind === 'item-add' && entry.key === key)),
  };
  if (state.items[key] && !hadAdd) next = enqueue(next, { kind: 'item-remove', key, attempts: 0 });
  return { state: next, changed: true };
}

function adoptFolderId(state: PersistedFolders, fromId: string, toId: string): PersistedFolders {
  if (fromId === toId) return state;
  const folder = state.folders[fromId];
  if (!folder) return state;
  const folders = { ...state.folders };
  delete folders[fromId];
  folders[toId] = { ...folder, id: toId };

  const items: Record<string, FolderItem> = {};
  for (const item of Object.values(state.items)) {
    const next = item.folderId === fromId ? { ...item, folderId: toId } : item;
    items[itemKey(next.folderId, next.itemId)] = next;
  }

  const outbox = state.outbox.flatMap((entry) => {
    if (entry.kind === 'folder' && entry.key === fromId) return [];
    if (entry.kind !== 'folder' && entry.key.startsWith(`${fromId}:`)) {
      const itemId = entry.key.slice(fromId.length + 1);
      return [{ ...entry, key: itemKey(toId, itemId) }];
    }
    return [entry];
  });

  return { ...state, folders, items, outbox };
}

function mergeRemote(
  state: PersistedFolders,
  remoteFolders: readonly Folder[],
  remoteItems: readonly FolderItem[],
  remoteWords: readonly UserItem[] = [],
): PersistedFolders {
  const folders = { ...state.folders };
  const remoteIds = new Set(remoteFolders.map((folder) => folder.id));

  for (const remote of remoteFolders) {
    if (state.outbox.some((entry) => entry.kind === 'folder-delete' && entry.key === remote.id)) {
      continue;
    }
    const pending = state.outbox.some(
      (entry) => entry.kind === 'folder' && entry.key === remote.id,
    );
    if (!folders[remote.id] || !pending) folders[remote.id] = remote;
  }

  for (const folder of Object.values({ ...folders })) {
    if (remoteIds.has(folder.id)) continue;
    const pendingFolder = state.outbox.some(
      (entry) => entry.kind === 'folder' && entry.key === folder.id,
    );
    const pendingItem = state.outbox.some(
      (entry) => entry.kind !== 'folder' && entry.key.startsWith(`${folder.id}:`),
    );
    if (pendingFolder || pendingItem) continue;
    delete folders[folder.id];
  }

  const items: Record<string, FolderItem> = {};
  for (const [key, item] of Object.entries(state.items)) {
    if (folders[item.folderId]) items[key] = item;
  }

  const remoteKeys = new Set(remoteItems.map((item) => itemKey(item.folderId, item.itemId)));
  for (const item of remoteItems) {
    if (!folders[item.folderId]) continue;
    const key = itemKey(item.folderId, item.itemId);
    const pendingRemove = state.outbox.some(
      (entry) => entry.kind === 'item-remove' && entry.key === key,
    );
    const pendingAdd = state.outbox.some((entry) => entry.kind === 'item-add' && entry.key === key);
    if (pendingRemove || pendingAdd) continue;
    items[key] = item;
  }

  for (const key of Object.keys(items)) {
    if (remoteKeys.has(key)) continue;
    const pendingAdd = state.outbox.some((entry) => entry.kind === 'item-add' && entry.key === key);
    if (pendingAdd) continue;
    delete items[key];
  }

  const outbox = state.outbox.filter((entry) => {
    if (entry.kind !== 'item-remove') return true;
    return remoteKeys.has(entry.key);
  });

  return mergeUserItems({ ...state, folders, items, outbox }, remoteWords);
}

function mergeUserItems(
  state: PersistedFolders,
  remoteWords: readonly UserItem[],
): PersistedFolders {
  const userItems = { ...state.userItems };
  const remoteIds = new Set(remoteWords.map((item) => item.id));

  for (const remote of remoteWords) {
    if (
      state.outbox.some((entry) => entry.kind === 'user-item-delete' && entry.key === remote.id)
    ) {
      continue;
    }
    const pending = state.outbox.some(
      (entry) => entry.kind === 'user-item' && entry.key === remote.id,
    );
    if (!userItems[remote.id] || !pending) userItems[remote.id] = remote;
  }

  for (const item of Object.values({ ...userItems })) {
    if (remoteIds.has(item.id)) continue;
    const pending = state.outbox.some(
      (entry) =>
        (entry.kind === 'user-item' || entry.kind === 'user-item-delete') && entry.key === item.id,
    );
    if (pending) continue;
    delete userItems[item.id];
  }

  return { ...state, userItems };
}

function putUserItem(state: PersistedFolders, item: UserItem): PersistedFolders {
  return { ...state, userItems: { ...state.userItems, [item.id]: item } };
}

function dropUserItem(state: PersistedFolders, itemId: string): PersistedFolders {
  const userItems = { ...state.userItems };
  delete userItems[itemId];
  const items: Record<string, FolderItem> = {};
  for (const [key, item] of Object.entries(state.items)) {
    if (item.itemId !== itemId) items[key] = item;
  }
  const suffix = `:${itemId}`;
  const outbox = state.outbox.filter((entry) => {
    if ((entry.kind === 'user-item' || entry.kind === 'user-item-delete') && entry.key === itemId) {
      return false;
    }
    if ((entry.kind === 'item-add' || entry.kind === 'item-remove') && entry.key.endsWith(suffix)) {
      return false;
    }
    return true;
  });
  return enqueue(
    { ...state, userItems, items, outbox },
    { kind: 'user-item-delete', key: itemId, attempts: 0 },
  );
}

function assertUniqueWord(state: PersistedFolders, es: string, exceptId?: string): void {
  const folded = foldPhrase(es);
  const duplicate = Object.values(state.userItems).some(
    (item) => item.id !== exceptId && foldPhrase(item.es) === folded,
  );
  if (duplicate) throw new Error('duplicate');
}

function requireUserItem(input: ParsedUserItem): ParsedUserItem {
  const es = input.es.trim();
  const tr = input.tr.trim();
  const note = input.note?.trim() ?? '';
  if (es.length < 1 || es.length > 80) throw new Error('Invalid custom word');
  if (tr.length < 1 || tr.length > 120) throw new Error('Invalid custom word');
  if (note.length > 240) throw new Error('Invalid custom word');
  return { es, tr, note: note.length > 0 ? note : null };
}

function cleanUserItems(value: unknown): Record<string, UserItem> {
  if (typeof value !== 'object' || value === null) return {};
  const items: Record<string, UserItem> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isUserItem(entry) || entry.id !== key) continue;
    items[key] = {
      id: entry.id,
      es: entry.es,
      tr: entry.tr,
      note: entry.note,
      createdAt: entry.createdAt,
    };
  }
  return items;
}

function isUserItem(value: unknown): value is UserItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as UserItem;
  return (
    typeof item.id === 'string' &&
    typeof item.es === 'string' &&
    typeof item.tr === 'string' &&
    (item.note === null || typeof item.note === 'string') &&
    typeof item.createdAt === 'string'
  );
}

function cleanFolderItems(value: unknown): Record<string, FolderItem> {
  if (typeof value !== 'object' || value === null) return {};
  const items: Record<string, FolderItem> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as FolderItem;
    if (typeof item.folderId !== 'string' || typeof item.itemId !== 'string') continue;
    if (typeof item.addedAt !== 'string') continue;
    items[key] = { ...item, userItemId: item.userItemId ?? null };
  }
  return items;
}

function cleanPins(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const itemId = cleanItemId(entry);
    if (!itemId || ids.includes(itemId)) continue;
    ids.push(itemId);
  }
  return ids;
}

function mergePins(current: readonly string[], extra: readonly string[]): string[] {
  const pins = [...current];
  for (const id of extra) {
    if (!pins.includes(id)) pins.push(id);
  }
  return pins;
}

function uniqueItemIds(itemIds: readonly string[]): string[] {
  const ids: string[] = [];
  for (const raw of itemIds) {
    const itemId = cleanItemId(raw);
    if (!itemId) throw new Error('Invalid item id');
    if (!ids.includes(itemId)) ids.push(itemId);
  }
  return ids;
}

function requireDraft(input: FolderDraft): FolderDraft {
  const name = parseFolderName(input.name);
  if (!name) throw new Error('Invalid folder name');
  if (!isFolderColor(input.color)) throw new Error('Invalid folder color');
  return { name, color: input.color };
}

function assertEditable(folder: Folder): void {
  if (folder.systemKey === 'difficult') throw new Error('Folder is automatic');
}

function assertUser(userId: string): void {
  if (userId.trim().length < 1) throw new Error('Invalid user id');
}

function splitItemKey(key: string): { folderId: string; itemId: string } | null {
  const index = key.indexOf(':');
  if (index <= 0 || index === key.length - 1) return null;
  return { folderId: key.slice(0, index), itemId: key.slice(index + 1) };
}

function enqueue(state: PersistedFolders, item: OutboxItem): PersistedFolders {
  if (state.outbox.some((entry) => sameItem(entry, item))) return state;
  return { ...state, outbox: [...state.outbox, item] };
}

function without(state: PersistedFolders, item: OutboxItem): PersistedFolders {
  return { ...state, outbox: state.outbox.filter((entry) => !sameItem(entry, item)) };
}

function bump(state: PersistedFolders, item: OutboxItem): PersistedFolders {
  return {
    ...state,
    outbox: state.outbox.map((entry) =>
      sameItem(entry, item) ? { ...entry, attempts: entry.attempts + 1 } : entry,
    ),
  };
}

function sameItem(left: OutboxItem, right: OutboxItem): boolean {
  return left.kind === right.kind && left.key === right.key;
}

function outboxToken(item: OutboxItem): string {
  return `${item.kind}:${item.key}`;
}

function retryDelayMs(attempts: number): number {
  const exponent = Math.min(Math.max(attempts, 1), 5) - 1;
  return 1000 * 2 ** exponent;
}

function randomId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
}

function defaultSchedule(fn: () => void, delayMs: number): () => void {
  const timer = setTimeout(fn, delayMs);
  return () => clearTimeout(timer);
}
