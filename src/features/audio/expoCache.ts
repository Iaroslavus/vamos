import { Directory, File, Paths } from 'expo-file-system';

import type { AudioCacheStore } from './cache';

const ROOT = 'vamos-audio';

function destination(objectPath: string): File {
  const segments = objectPath.split('/').filter((segment) => segment !== '' && segment !== '.');
  if (segments.some((segment) => segment === '..')) {
    throw new Error('Audio path cannot climb out of the cache');
  }
  const fileName = segments.pop();
  if (!fileName) throw new Error('Audio path is empty');
  const directory = new Directory(Paths.cache, ROOT, ...segments);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return new File(directory, fileName);
}

/** On-device cache of Supabase Storage clips, so a downloaded topic plays offline. */
export function createExpoAudioCache(): AudioCacheStore {
  return {
    async localUri(objectPath) {
      const file = destination(objectPath);
      return file.exists ? file.uri : null;
    },
    async download(objectPath, url) {
      const file = destination(objectPath);
      if (file.exists) return;
      await File.downloadFileAsync(url, file, { idempotent: true });
    },
  };
}
