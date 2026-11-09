import { isStudyMode } from './modes';
import {
  ACCENT_LEVELS,
  DEFAULT_STUDY_PREFS,
  DEFAULT_TEST_SETTINGS,
  STUDY_COUNTS,
  STUDY_DIRECTIONS,
  STUDY_FILTERS,
  TEST_COUNTS,
  TEST_KINDS,
  type StudyPrefs,
  type StudySettings,
  type TestKind,
  type TestSettings,
} from './types';

export function studyPrefsKey(userId: string, folderId: string): string {
  return `vamos.study.prefs.${userId}.${folderId}`;
}

export function parseStudyPrefs(raw: string | null): StudyPrefs {
  if (!raw) return DEFAULT_STUDY_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_STUDY_PREFS;
    const record = parsed as { settings?: unknown; test?: unknown; lastMode?: unknown };
    return {
      settings: parseSettings(record.settings),
      test: parseTestSettings(record.test),
      lastMode: isStudyMode(record.lastMode) ? record.lastMode : null,
    };
  } catch {
    return DEFAULT_STUDY_PREFS;
  }
}

export function serializeStudyPrefs(prefs: StudyPrefs): string {
  return JSON.stringify({
    settings: prefs.settings,
    test: prefs.test,
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

function parseTestSettings(value: unknown): TestSettings {
  const fallback = DEFAULT_TEST_SETTINGS;
  if (typeof value !== 'object' || value === null) return fallback;
  const record = value as Partial<TestSettings>;
  const kinds = parseTestKinds(record.kinds);
  return {
    count: oneOf(TEST_COUNTS, record.count, fallback.count),
    kinds,
    direction: oneOf(STUDY_DIRECTIONS, record.direction, fallback.direction),
  };
}

function parseTestKinds(value: unknown): readonly TestKind[] {
  if (!Array.isArray(value)) return DEFAULT_TEST_SETTINGS.kinds;
  const picked = new Set<TestKind>();
  for (const item of value) {
    if ((TEST_KINDS as readonly string[]).includes(String(item))) picked.add(item as TestKind);
  }
  const kinds = TEST_KINDS.filter((kind) => picked.has(kind));
  return kinds.length > 0 ? kinds : DEFAULT_TEST_SETTINGS.kinds;
}

function oneOf<T extends string | number>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.some((item) => item === value) ? (value as T) : fallback;
}
