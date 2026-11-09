import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

import { parseStudyPrefs, serializeStudyPrefs, studyPrefsKey } from '../prefs';
import {
  DEFAULT_STUDY_PREFS,
  type StudyMode,
  type StudyPrefs,
  type StudySettings,
  type TestSettings,
} from '../types';

export function useStudyPrefs(userId: string | null, folderId: string) {
  const key = userId && folderId ? studyPrefsKey(userId, folderId) : null;
  const [loaded, setLoaded] = useState<{ key: string; prefs: StudyPrefs } | null>(null);
  const prefsRef = useRef(DEFAULT_STUDY_PREFS);
  const writes = useRef(0);
  const ready = key == null || loaded?.key === key;
  const prefs = loaded?.key === key ? loaded.prefs : DEFAULT_STUDY_PREFS;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const seen = writes.current;
    void AsyncStorage.getItem(key).then((raw) => {
      if (!alive) return;
      if (writes.current !== seen) return;
      const next = parseStudyPrefs(raw);
      prefsRef.current = next;
      setLoaded({ key, prefs: next });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const write = (next: StudyPrefs) => {
    writes.current += 1;
    prefsRef.current = next;
    if (!key) return;
    setLoaded({ key, prefs: next });
    void AsyncStorage.setItem(key, serializeStudyPrefs(next));
  };

  return {
    prefs,
    ready,
    setSettings(settings: StudySettings) {
      write({ ...prefsRef.current, settings });
    },
    setLastMode(lastMode: StudyMode) {
      write({ ...prefsRef.current, lastMode });
    },
    setTestSettings(test: TestSettings) {
      write({ ...prefsRef.current, test });
    },
  };
}
