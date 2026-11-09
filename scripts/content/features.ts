/**
 * MFCC references for every normal-speed voice of a unit.
 *
 * Called while audio is generated, and on its own:
 *   npx tsx scripts/content/features.ts
 *   npx tsx scripts/content/features.ts --force
 *
 * es-ES and es-MX are both stored. A male clip is included when that voice
 * is the one the provider synthesizes. The JSON stays under 10 KB and is
 * uploaded beside the clips. The path is written to items.audio.features.
 *
 * Keys stay in the environment: CONTENT_SUPABASE_URL, CONTENT_SUPABASE_KEY.
 * Optional: TTS_PROVIDER (default azure).
 */
import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import { publicAudioUrl } from '../../src/features/audio/storage';
import { voicesForVariant, type AudioPreference } from '../../src/features/audio/select';
import { ItemSchema, type Item } from '../../src/features/content/schema';
import { storageUploadRequest, clipPath } from '../../src/features/content/pipeline/tts';
import { activeVoice } from '../../src/features/content/pipeline/ttsProviders';
import {
  applyFeaturesPaths,
  encodeDrafts,
  featuresObjectPath,
  type VoiceDraft,
} from '../../src/features/speech/acoustic/reference';
import { decodeWavPcm } from '../../src/features/speech/acoustic/wav';

import { decodeToPcmWav } from './ffmpeg';
import { putStorageBytes } from './put-storage';

export type FreshClip = {
  voice: AudioPreference;
  audio: Uint8Array;
};

export async function buildUnitFeatureFile(input: {
  item: Item;
  providerId: string;
  fresh: readonly FreshClip[];
  readStored: (objectPath: string) => Promise<Uint8Array | null>;
}): Promise<{ path: string; body: Uint8Array } | null> {
  const freshByVoice = new Map(input.fresh.map((clip) => [clip.voice, clip.audio]));
  const drafts: VoiceDraft[] = [];
  for (const voice of voicesForVariant(input.item.variant)) {
    const locale = voice === 'es' ? 'es-ES' : 'es-MX';
    const labeled = activeVoice(input.providerId, locale);
    if (!labeled) continue;
    const bytes =
      freshByVoice.get(voice) ?? (await storedNormal(input.item, voice, input.readStored));
    if (!bytes) continue;
    const wav = await decodeToPcmWav(bytes);
    drafts.push({
      locale,
      gender: labeled.gender,
      samples: decodeWavPcm(wav).samples,
    });
  }
  if (drafts.length === 0) return null;
  const json = encodeDrafts(drafts);
  return {
    path: featuresObjectPath(input.item),
    body: new TextEncoder().encode(json),
  };
}

async function storedNormal(
  item: Item,
  voice: AudioPreference,
  readStored: (objectPath: string) => Promise<Uint8Array | null>,
): Promise<Uint8Array | null> {
  const stored = clipPath(item, null, voice, 'normal');
  if (!stored || !stored.startsWith('items/')) return null;
  return readStored(stored);
}

async function main(): Promise<void> {
  const force = parseForce(process.argv.slice(2));
  const providerId = process.env.TTS_PROVIDER?.trim() || 'azure';
  const supabaseUrl = requiredEnv('CONTENT_SUPABASE_URL');
  const storageKey = requiredEnv('CONTENT_SUPABASE_KEY');
  const root = process.cwd();
  const files = walkItemFiles(path.join(root, 'content/items'));
  let written = 0;

  for (const file of files) {
    const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    const items = z.array(ItemSchema).parse(raw);
    const updates: { id: string; path: string }[] = [];
    for (const item of items) {
      if (item.audio.features && !force) continue;
      const built = await buildUnitFeatureFile({
        item,
        providerId,
        fresh: [],
        readStored: (objectPath) => downloadStoredAudio(objectPath, supabaseUrl),
      });
      if (!built) continue;
      const upload = storageUploadRequest({
        supabaseUrl,
        apiKey: storageKey,
        objectPath: built.path,
      });
      // The audio bucket rejects anything outside its allow-list with 415.
      upload.headers['Content-Type'] = 'application/json';
      await putStorageBytes(upload, built.body, storageKey);
      updates.push({ id: item.id, path: built.path });
    }
    if (updates.length === 0) continue;
    fs.writeFileSync(file, `${JSON.stringify(applyFeaturesPaths(raw, updates), null, 2)}\n`);
    written += updates.length;
    console.log(`${path.relative(root, file)}: ${updates.length}`);
  }

  console.log(written === 0 ? 'Эталоны уже есть.' : `Записано эталонов: ${written}.`);
}

function parseForce(argv: readonly string[]): boolean {
  let force = false;
  for (const arg of argv) {
    if (arg === '--force') force = true;
    else throw new Error(`Неизвестный аргумент ${arg}`);
  }
  return force;
}

export async function downloadStoredAudio(
  objectPath: string,
  supabaseUrl: string,
): Promise<Uint8Array | null> {
  const response = await fetch(publicAudioUrl(objectPath, supabaseUrl));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Не удалось прочитать ${objectPath} (${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim() ?? '';
  if (value) return value;
  throw new Error(`${name} не задан. Положите ключ в окружение, не в репозиторий и не в клиент.`);
}

function walkItemFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkItemFiles(full));
    else if (entry.name.endsWith('.json')) found.push(full);
  }
  return found.sort();
}

const entry = process.argv[1] ?? '';
if (entry.endsWith(`${path.sep}features.ts`) || entry.endsWith(`${path.sep}features.js`)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
