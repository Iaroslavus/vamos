import { DEFAULT_STUDY_PREFS, DEFAULT_TEST_SETTINGS } from './types';
import { parseStudyPrefs, serializeStudyPrefs, studyPrefsKey } from './prefs';

describe('study prefs', () => {
  it('keys settings by user and folder', () => {
    expect(studyPrefsKey('user-1', 'folder-1')).toBe('vamos.study.prefs.user-1.folder-1');
  });

  it('falls back when the stored value is missing or broken', () => {
    expect(parseStudyPrefs(null)).toEqual(DEFAULT_STUDY_PREFS);
    expect(parseStudyPrefs('not-json')).toEqual(DEFAULT_STUDY_PREFS);
    expect(
      parseStudyPrefs(JSON.stringify({ settings: { count: 7, direction: 'sideways' } })),
    ).toEqual(DEFAULT_STUDY_PREFS);
  });

  it('round-trips a folder session', () => {
    const prefs = parseStudyPrefs(
      serializeStudyPrefs({
        lastMode: 'spell',
        settings: {
          direction: 'mixed',
          filter: 'hard',
          count: 5,
          autoplay: false,
          accentStrictness: 'strict',
        },
        test: {
          count: 30,
          kinds: ['input', 'pairs'],
          direction: 'ru_to_es',
        },
      }),
    );
    expect(prefs.lastMode).toBe('spell');
    expect(prefs.test).toEqual({
      count: 30,
      kinds: ['input', 'pairs'],
      direction: 'ru_to_es',
    });
    expect(prefs.settings).toMatchObject({
      direction: 'mixed',
      filter: 'hard',
      count: 5,
      autoplay: false,
      accentStrictness: 'strict',
    });
  });

  it('drops an unknown last mode', () => {
    const prefs = parseStudyPrefs(JSON.stringify({ lastMode: 'arcade', settings: {} }));
    expect(prefs.lastMode).toBeNull();
  });

  it('keeps a test setup and drops unknown question types', () => {
    expect(parseStudyPrefs(null).test).toEqual(DEFAULT_TEST_SETTINGS);
    const prefs = parseStudyPrefs(
      JSON.stringify({
        test: { count: 15, kinds: ['choice', 'nope', 'choice'], direction: 'mixed' },
      }),
    );
    expect(prefs.test).toEqual({
      count: DEFAULT_TEST_SETTINGS.count,
      kinds: ['choice'],
      direction: 'mixed',
    });
  });
});
