import type { CefrLevel, Item } from '@/features/content/schema';

import { itemAudioPath, shouldAdvanceOnSwipe, showsSayRu, SWIPE_NEXT_DISTANCE } from './intro';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'hola.buenos_dias',
    type: 'phrase',
    es: 'buenos días',
    ru: 'доброе утро',
    parts: [],
    say_ru: 'буЭнос дИас',
    note_ru: null,
    why_ru: null,
    level: 'A1',
    variant: 'both',
    audio: { es: 'a1/buenos-dias.mp3', latam: 'a1/buenos-dias-latam.mp3' },
    tags: [],
    draft: false,
    ...overrides,
  };
}

describe('showsSayRu', () => {
  it.each([
    ['A1', true],
    ['A2', true],
    ['B1', false],
    ['B2', false],
    ['C1', false],
    ['C2', false],
  ] as const)('level %s → %s', (level: CefrLevel, expected: boolean) => {
    expect(showsSayRu(level)).toBe(expected);
  });
});

describe('itemAudioPath', () => {
  it('prefers the Spain recording', () => {
    expect(itemAudioPath(item())).toBe('a1/buenos-dias.mp3');
  });

  it('prefers Latin America when asked', () => {
    expect(itemAudioPath(item(), 'latam')).toBe('a1/buenos-dias-latam.mp3');
  });

  it('falls back to the other region when the preferred track is missing', () => {
    const spainOnly = item({ audio: { es: 'a1/hola.mp3', latam: null } });
    const latamOnly = item({ audio: { es: null, latam: 'a1/hola-latam.mp3' } });

    expect(itemAudioPath(spainOnly, 'latam')).toBe('a1/hola.mp3');
    expect(itemAudioPath(latamOnly)).toBe('a1/hola-latam.mp3');
    expect(itemAudioPath(item({ audio: { es: null, latam: null } }))).toBeNull();
  });
});

describe('shouldAdvanceOnSwipe', () => {
  it('advances on a long left swipe', () => {
    expect(shouldAdvanceOnSwipe(-SWIPE_NEXT_DISTANCE, 0)).toBe(true);
    expect(shouldAdvanceOnSwipe(-SWIPE_NEXT_DISTANCE + 1, 0)).toBe(false);
  });

  it('advances on a short left flick', () => {
    expect(shouldAdvanceOnSwipe(-24, -0.5)).toBe(true);
    expect(shouldAdvanceOnSwipe(-24, -0.49)).toBe(false);
    expect(shouldAdvanceOnSwipe(-23, -2)).toBe(false);
  });

  it('ignores a swipe to the right', () => {
    expect(shouldAdvanceOnSwipe(120, -2)).toBe(false);
  });
});
