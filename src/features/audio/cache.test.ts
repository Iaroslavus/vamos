import { blankAudio, ItemSchema } from '@/features/content/schema';
import { fillLocales } from '@/features/content/text';

import { cacheTopicAudio, collectTopicAudioPaths, type AudioCacheStore } from './cache';
import { itemsForTopic } from './topicAudio';

describe('topic audio cache', () => {
  it('collects storage paths for the phrase and its parts', () => {
    const item = ItemSchema.parse({
      id: 'cafe.hola',
      type: 'word',
      es: 'hola',
      tr: fillLocales('привет'),
      say: fillLocales('ола'),
      level: 'A1',
      audio: blankAudio({
        es: 'items/a1/cafe/hola.es.normal.m4a',
        slow: { es: 'items/a1/cafe/hola.es.slow.m4a' },
        parts: [
          {
            es: 'items/a1/cafe/hola.p0.es.normal.m4a',
            latam: null,
            slow: { es: null, latam: null },
          },
        ],
      }),
    });

    expect(collectTopicAudioPaths([item])).toEqual([
      'items/a1/cafe/hola.es.normal.m4a',
      'items/a1/cafe/hola.es.slow.m4a',
      'items/a1/cafe/hola.p0.es.normal.m4a',
    ]);
    expect(collectTopicAudioPaths([{ ...item, audio: blankAudio({ es: 'a1/hola.mp3' }) }])).toEqual(
      [],
    );
  });

  it('downloads each clip once', async () => {
    const item = ItemSchema.parse({
      id: 'cafe.hola',
      type: 'word',
      es: 'hola',
      tr: fillLocales('привет'),
      say: fillLocales('ола'),
      level: 'A1',
      audio: blankAudio({ es: 'items/a1/cafe/hola.es.normal.m4a' }),
    });
    const downloaded: string[] = [];
    const have = new Set<string>();
    const store: AudioCacheStore = {
      async localUri(objectPath) {
        return have.has(objectPath) ? `file:///${objectPath}` : null;
      },
      async download(objectPath, url) {
        downloaded.push(url);
        have.add(objectPath);
      },
    };

    await cacheTopicAudio([item], 'http://127.0.0.1:54321/', store);
    await cacheTopicAudio([item], 'http://127.0.0.1:54321/', store);

    expect(downloaded).toEqual([
      'http://127.0.0.1:54321/storage/v1/object/public/audio/items/a1/cafe/hola.es.normal.m4a',
    ]);
  });

  it('loads every unit of a starter topic', () => {
    const items = itemsForTopic('a1.hola');
    expect(items.length).toBeGreaterThan(6);
    expect(items.some((item) => item.id === 'hola.hola')).toBe(true);
  });
});
