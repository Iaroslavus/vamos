import { File } from 'expo-file-system';

import { registerAudioCache, type AudioCacheStore } from '@/features/audio/cache';

import { loadUnitFeatures } from './load';

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

const PATH = 'items/a1/cafe/hola.features.json';
const PUBLIC_URL =
  'http://127.0.0.1:54321/storage/v1/object/public/audio/items/a1/cafe/hola.features.json';
const FEATURES_JSON =
  '{"v":1,"sampleRate":16000,"stride":1,"voices":[{"locale":"es-ES","gender":"female","scale":1,"width":1,"data":"gA=="}]}';

function bytesOf(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe('loadUnitFeatures', () => {
  const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.mocked(File).mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321/';
    registerAudioCache(null);
  });

  afterEach(() => {
    registerAudioCache(null);
    process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
  });

  it('reads a cached features file with the same object-path key as audio', async () => {
    const store: AudioCacheStore = {
      async localUri(objectPath) {
        return objectPath === PATH ? 'file:///cache/vamos-audio/hola.features.json' : null;
      },
      async download() {
        throw new Error('cache hit must not download');
      },
    };
    registerAudioCache(store);
    jest.mocked(File).mockImplementation(
      () =>
        ({
          exists: true,
          arrayBuffer: async () => bytesOf(FEATURES_JSON),
        }) as never,
    );

    const loaded = await loadUnitFeatures(PATH);

    expect(loaded?.voices).toEqual([
      expect.objectContaining({ locale: 'es-ES', gender: 'female' }),
    ]);
    expect(File).toHaveBeenCalledWith('file:///cache/vamos-audio/hola.features.json');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads a missing reference from the public audio URL', async () => {
    registerAudioCache({
      async localUri() {
        return null;
      },
      async download() {
        return undefined;
      },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => FEATURES_JSON,
    });

    const loaded = await loadUnitFeatures(PATH);

    expect(loaded?.v).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(PUBLIC_URL);
    expect(File).not.toHaveBeenCalled();
  });

  it('ignores a path that is not a stored features file', async () => {
    expect(await loadUnitFeatures('a1/hola.mp3')).toBeNull();
    expect(await loadUnitFeatures(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
