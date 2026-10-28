/**
 * Upload a narrator recording into the audio bucket.
 *
 * Content-Type follows the extension and stays on the bucket allow-list:
 *   .m4a -> audio/mp4
 *   .mp3 -> audio/mpeg
 *
 * Keys stay in the environment:
 *   CONTENT_SUPABASE_URL, CONTENT_SUPABASE_KEY
 *
 * Usage: tsx scripts/content/import-human.ts <local-file> <object-path>
 *   object path example: items/a1/hola/hola.es.normal.m4a
 */
import fs from 'fs';

import {
  audioUploadContentType,
  storageUploadRequest,
} from '../../src/features/content/pipeline/tts';

import { putStorageBytes } from './put-storage';

async function main(): Promise<void> {
  const [localFile, objectPath] = process.argv.slice(2);
  if (!localFile || !objectPath || process.argv.length > 4) {
    throw new Error('Использование: tsx scripts/content/import-human.ts <файл> <путь-в-бакете>');
  }

  const supabaseUrl = requiredEnv('CONTENT_SUPABASE_URL');
  const storageKey = requiredEnv('CONTENT_SUPABASE_KEY');
  const localType = audioUploadContentType(localFile);
  const objectType = audioUploadContentType(objectPath);
  if (localType !== objectType) {
    throw new Error('Расширение файла и пути в бакете должны совпадать (.m4a или .mp3).');
  }

  const bytes = new Uint8Array(fs.readFileSync(localFile));
  const upload = storageUploadRequest({
    supabaseUrl,
    apiKey: storageKey,
    objectPath,
  });
  if (upload.headers['Content-Type'] !== objectType) {
    throw new Error(`Content-Type ${upload.headers['Content-Type']} не совпал с ${objectType}.`);
  }
  await putStorageBytes(upload, bytes, storageKey);
  console.log(`${objectPath}: ${objectType}`);
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim() ?? '';
  if (value) return value;
  throw new Error(`${name} не задан. Положите ключ в окружение, не в репозиторий и не в клиент.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'import-human failed';
  console.error(message);
  process.exitCode = 1;
});
