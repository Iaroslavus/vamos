import {
  applyPatch,
  EMPTY_PROFILE,
  mergeProfiles,
  parseDisplayName,
  profilesEqual,
} from './profile';

describe('parseDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(parseDisplayName('  Анна   Мария  ')).toBe('Анна Мария');
  });

  it('rejects an empty name and a name past the profile limit', () => {
    expect(parseDisplayName('   ')).toBeNull();
    expect(parseDisplayName('я'.repeat(61))).toBeNull();
    expect(parseDisplayName('я'.repeat(60))).toHaveLength(60);
  });
});

describe('applyPatch', () => {
  it('keeps the previous name when the patch is not a display name', () => {
    const current = { ...EMPTY_PROFILE, name: 'Анна' };
    expect(applyPatch(current, { name: '   ' }).name).toBe('Анна');
    expect(applyPatch(current, { name: null }).name).toBeNull();
  });

  it('rejects a daily goal outside the allowed set', () => {
    const next = applyPatch(EMPTY_PROFILE, { dailyMinutes: 15 as never });
    expect(next.dailyMinutes).toBe(10);
  });
});

describe('mergeProfiles', () => {
  it('keeps a local name and treats a remote goal as already asked', () => {
    const merged = mergeProfiles(
      { ...EMPTY_PROFILE, name: 'Анна' },
      { ...EMPTY_PROFILE, name: 'Мария', goal: 'travel', preferencesAsked: false },
    );

    expect(merged).toEqual({
      name: 'Анна',
      goal: 'travel',
      dailyMinutes: 10,
      preferencesAsked: true,
    });
  });

  it('keeps local answers after this device already asked', () => {
    const local = {
      name: 'Анна',
      goal: 'work' as const,
      dailyMinutes: 20 as const,
      preferencesAsked: true,
    };
    const merged = mergeProfiles(local, {
      ...EMPTY_PROFILE,
      goal: 'travel',
      dailyMinutes: 5,
      preferencesAsked: true,
    });

    expect(merged).toEqual(local);
    expect(profilesEqual(merged, local)).toBe(true);
    expect(profilesEqual(merged, EMPTY_PROFILE)).toBe(false);
  });

  it('returns the local profile when the server has nothing', () => {
    expect(mergeProfiles(EMPTY_PROFILE, null)).toBe(EMPTY_PROFILE);
  });
});
