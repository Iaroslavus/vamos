import { DEFAULT_STUDY_PREFS } from './types';
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
      }),
    );
    expect(prefs.lastMode).toBe('spell');
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
});
