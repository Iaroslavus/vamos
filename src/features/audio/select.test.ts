import { blankAudio, blankTrack, type Item } from '@/features/content/schema';
import { fillLocales } from '@/features/content/text';

import {
  audioGaps,
  audioPreferenceFromVariant,
  formatAudioGap,
  isStoredAudioPath,
  selectClip,
  voicesForVariant,
} from './select';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'hola.buenos_dias',
    type: 'phrase',
    es: 'buenos días',
    tr: fillLocales('доброе утро'),
    literal: null,
    parts: [
      { es: 'buenos', tr: fillLocales('добрые') },
      { es: 'días', tr: fillLocales('утро') },
    ],
    say: fillLocales('буэнос диас'),
    note: null,
    why: null,
    level: 'A1',
    variant: 'both',
    audio: blankAudio({
      es: 'items/a1/hola/buenos.es.normal.m4a',
      latam: 'items/a1/hola/buenos.mx.normal.m4a',
      slow: {
        es: 'items/a1/hola/buenos.es.slow.m4a',
        latam: 'items/a1/hola/buenos.mx.slow.m4a',
      },
      parts: [
        blankTrack({
          es: 'items/a1/hola/buenos.p0.es.normal.m4a',
          latam: 'items/a1/hola/buenos.p0.mx.normal.m4a',
          slow: {
            es: 'items/a1/hola/buenos.p0.es.slow.m4a',
            latam: 'items/a1/hola/buenos.p0.mx.slow.m4a',
          },
        }),
        blankTrack({
          es: 'items/a1/hola/buenos.p1.es.normal.m4a',
          latam: 'items/a1/hola/buenos.p1.mx.normal.m4a',
          slow: {
            es: 'items/a1/hola/buenos.p1.es.slow.m4a',
            latam: 'items/a1/hola/buenos.p1.mx.slow.m4a',
          },
        }),
      ],
    }),
    tags: [],
    draft: false,
    draft_i18n: false,
    ...overrides,
  };
}

describe('audio preference', () => {
  it('maps the profile variant onto a recording', () => {
    expect(audioPreferenceFromVariant('spain')).toBe('es');
    expect(audioPreferenceFromVariant('latam')).toBe('latam');
    expect(audioPreferenceFromVariant(null)).toBe('es');
    expect(audioPreferenceFromVariant(undefined)).toBe('es');
  });

  it('asks both voices only for a neutral unit', () => {
    expect(voicesForVariant('both')).toEqual(['es', 'latam']);
    expect(voicesForVariant('es')).toEqual(['es']);
    expect(voicesForVariant('latam')).toEqual(['latam']);
  });
});

describe('selectClip', () => {
  it('plays the normal file for the profile variant', () => {
    const audio = item().audio;
    expect(selectClip(audio, 'es', 'normal')).toBe('items/a1/hola/buenos.es.normal.m4a');
    expect(selectClip(audio, 'latam', 'normal')).toBe('items/a1/hola/buenos.mx.normal.m4a');
  });

  it('plays the slow file instead of the normal one', () => {
    const audio = item().audio;
    expect(selectClip(audio, 'es', 'slow')).toBe('items/a1/hola/buenos.es.slow.m4a');
    expect(selectClip(audio, 'latam', 'slow')).toBe('items/a1/hola/buenos.mx.slow.m4a');
  });

  it('falls back to the other region for the same speed', () => {
    const spain = blankAudio({ es: 'items/a1/hola/hola.es.normal.m4a' });
    const latam = blankAudio({
      latam: 'items/a1/hola/hola.mx.normal.m4a',
      slow: { latam: 'items/a1/hola/hola.mx.slow.m4a' },
    });

    expect(selectClip(spain, 'latam', 'normal')).toBe('items/a1/hola/hola.es.normal.m4a');
    expect(selectClip(latam, 'es', 'slow')).toBe('items/a1/hola/hola.mx.slow.m4a');
  });

  it('returns null when the slow file is missing so speech can take over', () => {
    const normalOnly = blankAudio({ es: 'items/a1/hola/hola.es.normal.m4a' });
    expect(selectClip(normalOnly, 'es', 'slow')).toBeNull();
    expect(selectClip(blankAudio(), 'latam', 'normal')).toBeNull();
  });

  it('keeps a human recording in the same slot', () => {
    const audio = blankAudio({
      source: 'human',
      es: 'items/a1/hola/hola.es.normal.m4a',
      slow: { es: 'items/a1/hola/hola.es.slow.m4a' },
    });
    expect(audio.source).toBe('human');
    expect(selectClip(audio, 'es', 'normal')).toBe('items/a1/hola/hola.es.normal.m4a');
    expect(selectClip(audio, 'latam', 'slow')).toBe('items/a1/hola/hola.es.slow.m4a');
  });

  it('selects a part by index', () => {
    const audio = item().audio;
    expect(selectClip(audio, 'es', 'slow', 1)).toBe('items/a1/hola/buenos.p1.es.slow.m4a');
    expect(selectClip(audio, 'latam', 'normal', 0)).toBe('items/a1/hola/buenos.p0.mx.normal.m4a');
    expect(selectClip(audio, 'es', 'normal', 4)).toBeNull();
  });
});

describe('audio gaps', () => {
  it('treats a storage path as present and a legacy name as missing', () => {
    expect(isStoredAudioPath('items/a1/hola/hola.es.normal.m4a')).toBe(true);
    expect(isStoredAudioPath('https://cdn.example/a.m4a')).toBe(true);
    expect(isStoredAudioPath('a1/hola.mp3')).toBe(false);
    expect(isStoredAudioPath(null)).toBe(false);
  });

  it('lists every missing voice and speed, including parts', () => {
    const gaps = audioGaps(
      item({
        audio: blankAudio({ es: 'a1/hola.mp3' }),
        parts: [{ es: 'hola', tr: fillLocales('привет') }],
      }),
    );
    expect(gaps).toHaveLength(8);
    expect(formatAudioGap(gaps[0]!)).toBe('фраза, es-ES, обычно');
  });

  it('is quiet when a Spain-only unit has both speeds', () => {
    const ready = item({
      variant: 'es',
      parts: [],
      audio: blankAudio({
        es: 'items/a1/hola/hola.es.normal.m4a',
        slow: { es: 'items/a1/hola/hola.es.slow.m4a' },
      }),
    });
    expect(audioGaps(ready)).toEqual([]);
  });
});
