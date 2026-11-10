import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { pairsRecordKey, parsePairsRecord, serializePairsRecord } from '../games/pairsRecord';

export function usePairsRecord(userId: string | null, folderId: string) {
  const key = userId && folderId ? pairsRecordKey(userId, folderId) : null;
  const [loaded, setLoaded] = useState<{ key: string; bestMs: number | null } | null>(null);
  const ready = key == null || loaded?.key === key;
  const bestMs = loaded?.key === key ? loaded.bestMs : null;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    void AsyncStorage.getItem(key).then((raw) => {
      if (!alive) return;
      setLoaded({ key, bestMs: parsePairsRecord(raw) });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return {
    bestMs,
    ready,
    save(ms: number) {
      if (!key) return;
      setLoaded({ key, bestMs: ms });
      void AsyncStorage.setItem(key, serializePairsRecord(ms));
    },
  };
}
