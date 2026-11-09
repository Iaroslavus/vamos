import { isStudyMode } from './modes';
import {
  ACCENT_LEVELS,
  DEFAULT_STUDY_PREFS,
  STUDY_COUNTS,
  STUDY_DIRECTIONS,
  STUDY_FILTERS,
  type StudyPrefs,
  type StudySettings,
} from './types';

export function studyPrefsKey(userId: string, folderId: string): string {
  return `vamos.study.prefs.${userId}.${folderId}`;
}

export function parseStudyPrefs(raw: string | null): StudyPrefs {
  if (!raw) return DEFAULT_STUDY_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_STUDY_PREFS;
    const record = parsed as { settings?: unknown; lastMode?: unknown };
    return {
      settings: parseSettings(record.settings),
      lastMode: isStudyMode(record.lastMode) ? record.lastMode : null,
    };
  } catch {
    return DEFAULT_STUDY_PREFS;
  }
}

export function serializeStudyPrefs(prefs: StudyPrefs): string {
  return JSON.stringify({
    settings: prefs.settings,
    lastMode: prefs.lastMode,
  });
}

function parseSettings(value: unknown): StudySettings {
  const fallback = DEFAULT_STUDY_PREFS.settings;
  if (typeof value !== 'object' || value === null) return fallback;
  const record = value as Partial<StudySettings>;
  return {
    direction: oneOf(STUDY_DIRECTIONS, record.direction, fallback.direction),
    filter: oneOf(STUDY_FILTERS, record.filter, fallback.filter),
    count: oneOf(STUDY_COUNTS, record.count, fallback.count),
    autoplay: typeof record.autoplay === 'boolean' ? record.autoplay : fallback.autoplay,
    accentStrictness: oneOf(ACCENT_LEVELS, record.accentStrictness, fallback.accentStrictness),
  };
}

function oneOf<T extends string | number>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.some((item) => item === value) ? (value as T) : fallback;
}
