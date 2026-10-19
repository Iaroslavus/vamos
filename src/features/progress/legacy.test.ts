import { legacyXpClientId, parseLegacyProgressV28 } from './legacy';

const lesson = {
  lessonId: 'a1-u01-l01',
  accuracy: 88,
  xp: 20,
  completedAt: '2024-05-01T00:00:00.000Z',
};

describe('parseLegacyProgressV28', () => {
  it('reads a version 2.8 snapshot', () => {
    const parsed = parseLegacyProgressV28(JSON.stringify({ version: '2.8', lessons: [lesson] }));

    expect(parsed).toEqual({ version: '2.8', lessons: [lesson] });
    expect(legacyXpClientId(lesson)).toBe('v2.8:a1-u01-l01:2024-05-01T00:00:00.000Z:20');
  });

  it('ignores other versions and broken payloads', () => {
    expect(
      parseLegacyProgressV28(JSON.stringify({ version: '2.7', lessons: [lesson] })),
    ).toBeNull();
    expect(parseLegacyProgressV28('not-json')).toBeNull();
    expect(parseLegacyProgressV28(null)).toBeNull();
  });
});
