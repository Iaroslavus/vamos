import type { Tables, TablesInsert } from '@/lib/database.types';
import type { TypedSupabaseClient } from '@/lib/supabase';

import { isFolderColor } from './model';
import type { Folder, FolderItem, FolderKind, SystemKey, VocabRemote } from './types';

type FolderRow = Tables<'folders'>;
type ItemRow = Tables<'folder_items'>;

export function createSupabaseVocabRemote(client: TypedSupabaseClient): VocabRemote {
  return {
    async fetchFolders(userId) {
      const { data, error } = await client.from('folders').select('*').eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map(mapFolder);
    },

    async fetchItems() {
      const { data, error } = await client.from('folder_items').select('*');
      if (error) throw error;
      return (data ?? []).map(mapItem);
    },

    async upsertFolder(userId, folder) {
      const { data, error } = await client
        .from('folders')
        .upsert(folderPayload(userId, folder), { onConflict: 'id' })
        .select('*')
        .single();
      if (!error) return mapFolder(data);

      if (error.code === '23505' && (folder.systemKey || folder.topicId)) {
        const existing = await findTwin(client, userId, folder);
        if (existing) return mapFolder(existing);
      }
      throw error;
    },

    async insertItem(_userId, item) {
      const { error } = await client.from('folder_items').upsert(itemPayload(item), {
        onConflict: 'folder_id,item_id',
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },

    async deleteItem(_userId, folderId, itemId) {
      const { error } = await client
        .from('folder_items')
        .delete()
        .eq('folder_id', folderId)
        .eq('item_id', itemId);
      if (error) throw error;
    },
  };
}

async function findTwin(
  client: TypedSupabaseClient,
  userId: string,
  folder: Folder,
): Promise<FolderRow | null> {
  let query = client.from('folders').select('*').eq('user_id', userId);
  if (folder.systemKey) query = query.eq('system_key', folder.systemKey);
  else if (folder.topicId) query = query.eq('topic_id', folder.topicId);
  else return null;
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

function folderPayload(userId: string, folder: Folder): TablesInsert<'folders'> {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    color: folder.color,
    kind: folder.kind,
    topic_id: folder.topicId,
    system_key: folder.systemKey,
    created_at: folder.createdAt,
  };
}

function itemPayload(item: FolderItem): TablesInsert<'folder_items'> {
  return {
    folder_id: item.folderId,
    item_id: item.itemId,
    added_at: item.addedAt,
  };
}

function mapFolder(row: FolderRow): Folder {
  if (!isFolderColor(row.color)) throw new Error('Invalid folder color');
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    kind: kindOf(row.kind),
    topicId: row.topic_id,
    systemKey: systemKeyOf(row.system_key),
    createdAt: row.created_at,
  };
}

function mapItem(row: ItemRow): FolderItem {
  return {
    folderId: row.folder_id,
    itemId: row.item_id,
    addedAt: row.added_at,
  };
}

function kindOf(value: string): FolderKind {
  if (value === 'system' || value === 'custom') return value;
  throw new Error('Invalid folder kind');
}

function systemKeyOf(value: string | null): SystemKey | null {
  if (value === null) return null;
  if (value === 'favorites' || value === 'difficult') return value;
  throw new Error('Invalid system folder');
}
