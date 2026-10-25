import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';

import { vocabRepository } from '../defaultRepository';
import { folderTitle } from '../display';
import { folderHoldsAll, parseFolderName, sortFolders, type FolderColor } from '../model';
import type { Folder, FolderSnapshot } from '../types';

const NEW_FOLDER_COLOR: FolderColor = 'coral';

type UseAddToVocabSheetArgs = {
  visible: boolean;
  itemIds: readonly string[];
  onClose: () => void;
  onChanged: () => void;
};

export function useAddToVocabSheet({
  visible,
  itemIds,
  onClose,
  onChanged,
}: UseAddToVocabSheetArgs) {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const itemKey = itemIds.join('|');
  const ids = useMemo(() => (itemKey.length === 0 ? [] : itemKey.split('|')), [itemKey]);
  const [snapshot, setSnapshot] = useState<FolderSnapshot | null>(null);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [trackedOpen, setTrackedOpen] = useState(visible);
  const [seededKey, setSeededKey] = useState<string | null>(null);

  if (visible !== trackedOpen) {
    setTrackedOpen(visible);
    if (!visible) {
      setSeededKey(null);
      setCreating(false);
      setDraft('');
      setInvalid(false);
      setFailed(false);
      setChecked(new Set());
    }
  }

  if (visible && snapshot && seededKey !== itemKey) {
    const initial = new Set<string>();
    for (const folder of snapshot.folders) {
      if (folder.systemKey === 'difficult') continue;
      if (folderHoldsAll(snapshot.items, folder.id, ids)) initial.add(folder.id);
    }
    setSeededKey(itemKey);
    setChecked(initial);
  }

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    void vocabRepository
      .ensureBases(userId)
      .then((next) => {
        if (!cancelled) setSnapshot(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, visible]);

  const folders = useMemo(
    () => sortFolders(snapshot?.folders ?? []).filter((folder) => folder.systemKey !== 'difficult'),
    [snapshot],
  );

  const toggle = useCallback((folderId: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const save = useCallback(async () => {
    if (!userId || !snapshot || busy || ids.length === 0) return;
    const trimmed = draft.trim();
    const parsed = creating && trimmed.length > 0 ? parseFolderName(draft) : null;
    if (creating && trimmed.length > 0 && !parsed) {
      setInvalid(true);
      return;
    }

    setBusy(true);
    setFailed(false);
    setInvalid(false);
    try {
      const before = snapshot;
      let latest = snapshot;
      const targets = new Set(checked);
      if (parsed) {
        const known = new Set(latest.folders.map((folder) => folder.id));
        latest = await vocabRepository.createFolder(userId, {
          name: parsed,
          color: NEW_FOLDER_COLOR,
        });
        const created = latest.folders.find((folder) => !known.has(folder.id));
        if (!created) throw new Error('Folder was not created');
        targets.add(created.id);
      }

      const added: Folder[] = [];
      for (const folderId of targets) {
        if (folderHoldsAll(latest.items, folderId, ids)) continue;
        latest = await vocabRepository.addItems(userId, folderId, ids);
        const folder = latest.folders.find((entry) => entry.id === folderId);
        if (folder) added.push(folder);
      }

      for (const folder of before.folders) {
        if (folder.systemKey === 'difficult') continue;
        if (!folderHoldsAll(before.items, folder.id, ids)) continue;
        if (targets.has(folder.id)) continue;
        latest = await removeItems(userId, folder.id, ids);
      }

      setSnapshot(latest);
      onChanged();
      setCreating(false);
      setDraft('');
      onClose();
      if (added.length > 0) {
        setToast(
          t('vocab.addedToast', {
            count: ids.length,
            folders: added.map((folder) => `«${folderTitle(folder, t)}»`).join(', '),
          }),
        );
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [busy, checked, creating, draft, ids, onChanged, onClose, snapshot, t, userId]);

  return {
    folders,
    snapshot,
    checked,
    toggle,
    creating,
    setCreating,
    draft,
    setDraft,
    invalid,
    busy,
    failed,
    toast,
    dismissToast,
    save,
  };
}

async function removeItems(
  userId: string,
  folderId: string,
  itemIds: readonly string[],
): Promise<FolderSnapshot> {
  let latest = await vocabRepository.read(userId);
  for (const itemId of itemIds) {
    const present = latest.items.some(
      (item) => item.folderId === folderId && item.itemId === itemId,
    );
    if (!present) continue;
    latest = await vocabRepository.removeItem(userId, folderId, itemId);
  }
  return latest;
}
