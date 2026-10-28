import { blankAudio, type CefrLevel, type Item } from '@/features/content/schema';
import { fillLocales } from '@/features/content/text';

import {
  itemAudioPath,
  partAudioPath,
  shouldAdvanceOnSwipe,
  showsSayRu,
  SWIPE_NEXT_DISTANCE,
} from './intro';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'hola.buenos_dias',
    type: 'phrase',
    es: 'buenos días',
    tr: fillLocales('доброе утро'),
    parts: [],
    say: fillLocales('буЭнос дИас'),
    note: null,
    why: null,
    level: 'A1',
    variant: 'both',
    audio: blankAudio({
      es: 'a1/buenos-dias.mp3',
      latam: 'a1/buenos-dias-latam.mp3',
      slow: { es: 'a1/buenos-dias-slow.mp3', latam: 'a1/buenos-dias-latam-slow.mp3' },
    }),
    tags: [],
    draft: false,
    draft_i18n: false,
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
    const spainOnly = item({ audio: blankAudio({ es: 'a1/hola.mp3' }) });
    const latamOnly = item({ audio: blankAudio({ latam: 'a1/hola-latam.mp3' }) });

    expect(itemAudioPath(spainOnly, 'latam')).toBe('a1/hola.mp3');
    expect(itemAudioPath(latamOnly)).toBe('a1/hola-latam.mp3');
    expect(itemAudioPath(item({ audio: blankAudio() }))).toBeNull();
  });

  it('uses the slow file and leaves a missing slow file for speech', () => {
    expect(itemAudioPath(item(), 'latam', 'slow')).toBe('a1/buenos-dias-latam-slow.mp3');
    expect(
      itemAudioPath(item({ audio: blankAudio({ es: 'a1/hola.mp3' }) }), 'es', 'slow'),
    ).toBeNull();
  });

  it('plays a part file when that clip exists', () => {
    const withPart = item({
      audio: blankAudio({
        parts: [
          {
            es: 'items/a1/hola/buenos.p0.es.normal.m4a',
            latam: null,
            slow: { es: null, latam: null },
          },
        ],
      }),
    });
    expect(partAudioPath(withPart, 0)).toBe('items/a1/hola/buenos.p0.es.normal.m4a');
    expect(partAudioPath(item(), 0)).toBeNull();
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
