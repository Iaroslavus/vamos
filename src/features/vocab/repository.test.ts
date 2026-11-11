import { createVocabRepository, itemKey, vocabStorageKey } from './repository';
import type {
  Folder,
  FolderItem,
  KeyValueStorage,
  NetworkMonitor,
  UserItem,
  VocabRemote,
} from './types';

const USER = 'user-1';

function memoryStorage(): KeyValueStorage & { dump(): Map<string, string> } {
  const items = new Map<string, string>();
  return {
    async getItem(key) {
      return items.get(key) ?? null;
    },
    async setItem(key, value) {
      items.set(key, value);
    },
    async removeItem(key) {
      items.delete(key);
    },
    dump: () => items,
  };
}

function createNetwork(initial: boolean): NetworkMonitor & { setOnline(online: boolean): void } {
  let online = initial;
  const listeners = new Set<(online: boolean) => void>();
  return {
    async isOnline() {
      return online;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setOnline(next) {
      const becameOnline = !online && next;
      online = next;
      if (becameOnline) {
        for (const listener of listeners) listener(true);
      }
    },
  };
}

function createRemote() {
  const folders = new Map<string, Folder>();
  const items = new Map<string, FolderItem>();
  const words = new Map<string, UserItem>();
  let failAdds = 0;
  const inserted: FolderItem[] = [];
  const removed: string[] = [];
  const deletedFolders: string[] = [];
  const savedWords: UserItem[] = [];
  const deletedWords: string[] = [];

  const remote: VocabRemote = {
    async fetchFolders() {
      return [...folders.values()];
    },
    async fetchItems() {
      return [...items.values()];
    },
    async fetchUserItems() {
      return [...words.values()];
    },
    async upsertFolder(_userId, folder) {
      const twin = [...folders.values()].find(
        (entry) =>
          (folder.systemKey !== null && entry.systemKey === folder.systemKey) ||
          (folder.topicId !== null && entry.topicId === folder.topicId),
      );
      const saved = twin ?? folder;
      folders.set(saved.id, twin ? twin : folder);
      return saved;
    },
    async upsertUserItem(_userId, item) {
      words.set(item.id, item);
      savedWords.push(item);
      return item;
    },
    async deleteUserItem(_userId, itemId) {
      words.delete(itemId);
      for (const [key, item] of items) {
        if (item.itemId === itemId) items.delete(key);
      }
      deletedWords.push(itemId);
    },
    async insertItem(_userId, item) {
      if (failAdds > 0) {
        failAdds -= 1;
        throw new Error('insert failed');
      }
      items.set(itemKey(item.folderId, item.itemId), item);
      inserted.push(item);
    },
    async deleteItem(_userId, folderId, itemId) {
      items.delete(itemKey(folderId, itemId));
      removed.push(itemKey(folderId, itemId));
    },
    async deleteFolder(_userId, folderId) {
      folders.delete(folderId);
      for (const key of [...items.keys()]) {
        if (key.startsWith(`${folderId}:`)) items.delete(key);
      }
      deletedFolders.push(folderId);
    },
  };

  return {
    remote,
    folders,
    items,
    words,
    inserted,
    removed,
    deletedFolders,
    savedWords,
    deletedWords,
    failNextAdd() {
      failAdds += 1;
    },
  };
}

function ids() {
  let n = 0;
  return () => {
    n += 1;
    return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  };
}

function setup(online = false) {
  const storage = memoryStorage();
  const network = createNetwork(online);
  const remote = createRemote();
  const repository = createVocabRepository({
    storage,
    network,
    remote: remote.remote,
    now: () => '2026-10-25T12:00:00.000Z',
    createId: ids(),
    schedule: () => () => undefined,
  });
  return { storage, network, remote, repository };
}

describe('vocab repository', () => {
  it('creates favorites and difficult offline, then stays quiet', async () => {
    const { repository } = setup();
    const first = await repository.ensureBases(USER);
    const second = await repository.ensureBases(USER);

    expect(first.folders.map((folder) => folder.systemKey)).toEqual(['favorites', 'difficult']);
    expect(first.pending).toBe(2);
    expect(second.folders.map((folder) => folder.id)).toEqual(
      first.folders.map((folder) => folder.id),
    );
    expect(second.pending).toBe(2);
  });

  it('copies the old favorites list once', async () => {
    const { storage, repository } = setup();
    await storage.setItem(
      'vamos-favorites',
      JSON.stringify({ state: { itemIds: ['hola.hola'] }, version: 0 }),
    );

    const seeded = await repository.ensureBases(USER);
    const favorites = seeded.folders.find((folder) => folder.systemKey === 'favorites');
    expect(seeded.items).toEqual([
      expect.objectContaining({ folderId: favorites?.id, itemId: 'hola.hola' }),
    ]);

    await repository.removeItem(USER, favorites?.id ?? '', 'hola.hola');
    const again = await repository.ensureBases(USER);
    expect(again.items).toEqual([]);
  });

  it('replaces difficult items and creates a passed topic only once', async () => {
    const { repository } = setup();
    const first = await repository.syncDerived(USER, {
      topics: [{ topicId: 'a1.hola', name: '¡Hola!', itemIds: ['hola.hola', 'hola.adios'] }],
      difficultItemIds: ['hola.gracias', 'hola.hola'],
    });
    const difficult = first.folders.find((folder) => folder.systemKey === 'difficult');
    const topic = first.folders.find((folder) => folder.topicId === 'a1.hola');
    expect(difficultItems(first, difficult?.id)).toEqual(['hola.gracias', 'hola.hola']);
    expect(topic?.color).toBe('teal');
    expect(topicItems(first, topic?.id)).toEqual(['hola.adios', 'hola.hola']);

    await repository.removeItem(USER, topic?.id ?? '', 'hola.hola');
    const second = await repository.syncDerived(USER, {
      topics: [{ topicId: 'a1.hola', name: '¡Hola!', itemIds: ['hola.hola', 'hola.adios'] }],
      difficultItemIds: ['hola.gracias'],
    });
    expect(difficultItems(second, difficult?.id)).toEqual(['hola.gracias']);
    expect(topicItems(second, topic?.id)).toEqual(['hola.adios']);
    expect(second.folders.filter((folder) => folder.topicId === 'a1.hola')).toHaveLength(1);
  });

  it('rejects a blank name, a system rename, and a manual add to difficult', async () => {
    const { repository } = setup();
    const base = await repository.ensureBases(USER);
    const favorites = base.folders.find((folder) => folder.systemKey === 'favorites');
    const difficult = base.folders.find((folder) => folder.systemKey === 'difficult');

    await expect(repository.createFolder(USER, { name: '   ', color: 'coral' })).rejects.toThrow(
      'Invalid folder name',
    );
    await expect(
      repository.updateFolder(USER, favorites?.id ?? '', { name: 'Моё', color: 'coral' }),
    ).rejects.toThrow('System folder cannot be edited');
    await expect(repository.addItems(USER, difficult?.id ?? '', ['hola.hola'])).rejects.toThrow(
      'Folder is automatic',
    );
  });

  it('moves an item and drops an add that never reached the server', async () => {
    const { repository } = setup();
    const base = await repository.ensureBases(USER);
    const favorites = base.folders.find((folder) => folder.systemKey === 'favorites');
    const custom = await repository.createFolder(USER, { name: 'Для переезда', color: 'blue' });
    const folder = custom.folders.find((entry) => entry.kind === 'custom');

    const added = await repository.addItems(USER, favorites?.id ?? '', ['hola.hola']);
    expect(added.pending).toBe(base.pending + 2);
    const removed = await repository.removeItem(USER, favorites?.id ?? '', 'hola.hola');
    expect(removed.items).toEqual([]);
    expect(removed.pending).toBe(base.pending + 1);

    await repository.addItems(USER, favorites?.id ?? '', ['hola.gracias']);
    const moved = await repository.moveItem(USER, {
      itemId: 'hola.gracias',
      fromId: favorites?.id ?? '',
      toId: folder?.id ?? '',
    });
    expect(moved.items).toEqual([
      expect.objectContaining({ folderId: folder?.id, itemId: 'hola.gracias' }),
    ]);
  });

  it('flushes a folder created offline and keeps the item when the add fails once', async () => {
    const { repository, network, remote } = setup(false);
    const created = await repository.createFolder(USER, { name: 'Работа', color: 'ink' });
    const folder = created.folders.find((entry) => entry.kind === 'custom');
    expect(created.pending).toBeGreaterThan(0);

    network.setOnline(true);
    remote.failNextAdd();
    await repository.addItems(USER, folder?.id ?? '', ['hola.hola']);
    expect(remote.inserted).toEqual([]);

    const synced = await repository.sync(USER);
    expect(synced.pending).toBe(0);
    expect(remote.folders.get(folder?.id ?? '')?.name).toBe('Работа');
    expect(remote.items.get(itemKey(folder?.id ?? '', 'hola.hola'))).toBeTruthy();
  });

  it('adopts the server id of a system folder and uploads items there', async () => {
    const { repository, network, remote } = setup(false);
    const local = await repository.ensureBases(USER);
    const favorites = local.folders.find((folder) => folder.systemKey === 'favorites');
    await repository.addItems(USER, favorites?.id ?? '', ['hola.hola']);

    const serverId = '11111111-1111-4111-8111-111111111111';
    remote.folders.set(serverId, { ...favorites!, id: serverId });
    network.setOnline(true);

    const synced = await repository.sync(USER);
    expect(synced.folders.find((folder) => folder.systemKey === 'favorites')?.id).toBe(serverId);
    expect(synced.items).toEqual([
      expect.objectContaining({ folderId: serverId, itemId: 'hola.hola' }),
    ]);
    expect(synced.pending).toBe(0);
    expect(remote.items.has(itemKey(serverId, 'hola.hola'))).toBe(true);
    expect(remote.removed).toEqual([]);
  });

  it('reads a cache from before pinned difficult phrases', async () => {
    const { storage, repository } = setup();
    await storage.setItem(
      vocabStorageKey(USER),
      JSON.stringify({
        version: 1,
        folders: {},
        items: {},
        outbox: [],
        favoritesMigrated: true,
      }),
    );

    await expect(repository.read(USER)).resolves.toEqual({
      folders: [],
      items: [],
      userItems: [],
      pending: 0,
    });
  });

  it('pins phrases into difficult offline and keeps them when the automatic list drops them', async () => {
    const { repository } = setup(false);
    const seeded = await repository.syncDerived(USER, {
      topics: [],
      difficultItemIds: ['hola.hola', 'hola.gracias'],
    });
    const difficult = seeded.folders.find((folder) => folder.systemKey === 'difficult');
    const pinned = await repository.pinDifficult(USER, ['hola.hola', 'hola.adios']);

    expect(difficultItems(pinned, difficult?.id)).toEqual([
      'hola.adios',
      'hola.gracias',
      'hola.hola',
    ]);
    expect(pinned.pending).toBe(seeded.pending + 1);

    const again = await repository.pinDifficult(USER, ['hola.hola']);
    expect(again.pending).toBe(pinned.pending);
    expect(difficultItems(again, difficult?.id)).toEqual([
      'hola.adios',
      'hola.gracias',
      'hola.hola',
    ]);

    const dropped = await repository.syncDerived(USER, {
      topics: [],
      difficultItemIds: [],
    });
    expect(difficultItems(dropped, difficult?.id)).toEqual(['hola.adios', 'hola.hola']);
  });

  it('rejects an empty pin without writing and still blocks a manual add', async () => {
    const { repository } = setup();
    const base = await repository.ensureBases(USER);
    const difficult = base.folders.find((folder) => folder.systemKey === 'difficult');
    const empty = await repository.pinDifficult(USER, []);

    expect(empty.items).toEqual([]);
    expect(empty.pending).toBe(base.pending);
    await expect(repository.pinDifficult(USER, [' '])).rejects.toThrow('Invalid item id');
    await expect(repository.addItems(USER, difficult?.id ?? '', ['hola.hola'])).rejects.toThrow(
      'Folder is automatic',
    );
  });

  it('adds a phrase once and deletes only a custom folder', async () => {
    const { repository, network, remote } = setup(false);
    const created = await repository.createFolder(USER, { name: 'Поездка', color: 'teal' });
    const folder = created.folders.find((entry) => entry.kind === 'custom');
    const favorites = created.folders.find((entry) => entry.systemKey === 'favorites');
    const folderId = folder?.id ?? '';

    const once = await repository.addItems(USER, folderId, ['hola.hola']);
    const twice = await repository.addItems(USER, folderId, ['hola.hola', 'hola.hola']);
    expect(twice.items.filter((item) => item.itemId === 'hola.hola')).toHaveLength(1);
    expect(twice.pending).toBe(once.pending);

    network.setOnline(true);
    await repository.sync(USER);
    network.setOnline(false);
    expect(remote.folders.has(folderId)).toBe(true);

    await expect(repository.deleteFolder(USER, favorites?.id ?? '')).rejects.toThrow(
      'System folder cannot be deleted',
    );
    const removed = await repository.deleteFolder(USER, folderId);
    expect(removed.folders.find((entry) => entry.id === folderId)).toBeUndefined();
    expect(removed.items.filter((item) => item.folderId === folderId)).toEqual([]);
    expect(remote.folders.has(folderId)).toBe(true);

    network.setOnline(true);
    const synced = await repository.sync(USER);
    expect(synced.folders.find((entry) => entry.id === folderId)).toBeUndefined();
    expect(synced.pending).toBe(0);
    expect(remote.deletedFolders).toEqual([folderId]);
    expect(remote.folders.has(folderId)).toBe(false);
  });

  it('saves a custom word offline, then edits and deletes it', async () => {
    const { repository, network, remote } = setup(false);
    const created = await repository.createFolder(USER, { name: 'Поездка', color: 'teal' });
    const folder = created.folders.find((entry) => entry.kind === 'custom');
    const folderId = folder?.id ?? '';

    const saved = await repository.addUserItem(USER, folderId, {
      es: '  gato  ',
      tr: '  кот  ',
      note: '   ',
    });
    expect(saved.item).toMatchObject({ es: 'gato', tr: 'кот', note: null });
    expect(saved.snapshot.userItems).toEqual([saved.item]);
    expect(saved.snapshot.items).toEqual([
      expect.objectContaining({
        folderId,
        itemId: saved.item.id,
        userItemId: saved.item.id,
      }),
    ]);
    expect(remote.savedWords).toEqual([]);

    await expect(
      repository.addUserItem(USER, folderId, { es: 'Gató', tr: 'кошка', note: '' }),
    ).rejects.toThrow('duplicate');

    const edited = await repository.updateUserItem(USER, saved.item.id, {
      es: 'gata',
      tr: 'кошка',
      note: 'дом',
    });
    expect(edited.userItems).toEqual([
      expect.objectContaining({ id: saved.item.id, es: 'gata', tr: 'кошка', note: 'дом' }),
    ]);

    network.setOnline(true);
    const synced = await repository.sync(USER);
    expect(synced.pending).toBe(0);
    expect(remote.words.get(saved.item.id)?.es).toBe('gata');
    expect(remote.items.get(itemKey(folderId, saved.item.id))?.userItemId).toBe(saved.item.id);

    network.setOnline(false);
    const removed = await repository.deleteUserItem(USER, saved.item.id);
    expect(removed.userItems).toEqual([]);
    expect(removed.items.filter((item) => item.itemId === saved.item.id)).toEqual([]);
    expect(remote.deletedWords).toEqual([]);

    network.setOnline(true);
    await repository.sync(USER);
    expect(remote.deletedWords).toEqual([saved.item.id]);
    expect(remote.words.has(saved.item.id)).toBe(false);
  });

  it('keeps a custom word that has not reached the server when the pull is empty', async () => {
    const { repository, network } = setup(false);
    const created = await repository.createFolder(USER, { name: 'Дом', color: 'blue' });
    const folder = created.folders.find((entry) => entry.kind === 'custom');
    const saved = await repository.addUserItem(USER, folder?.id ?? '', {
      es: 'casa',
      tr: 'дом',
      note: '',
    });

    network.setOnline(true);
    const synced = await repository.sync(USER);
    expect(synced.userItems.map((item) => item.es)).toEqual(['casa']);
    expect(synced.items.map((item) => item.itemId)).toContain(saved.item.id);
  });

  it('refuses an unreadable local cache', async () => {
    const { storage, repository } = setup();
    await storage.setItem(vocabStorageKey(USER), '{');
    await expect(repository.read(USER)).rejects.toThrow('Stored folders are unreadable');
  });
});

function difficultItems(
  snapshot: { items: readonly { folderId: string; itemId: string }[] },
  folderId: string | undefined,
): string[] {
  return snapshot.items
    .filter((item) => item.folderId === folderId)
    .map((item) => item.itemId)
    .sort();
}

function topicItems(
  snapshot: { items: readonly { folderId: string; itemId: string; addedAt: string }[] },
  folderId: string | undefined,
): string[] {
  return snapshot.items.filter((item) => item.folderId === folderId).map((item) => item.itemId);
}
