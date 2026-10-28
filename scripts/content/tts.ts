/**
 * Neural TTS for every unit and every part.
 *
 * For variant both / es / latam: es-ES and es-MX as required, normal speed and
 * slow speed (Azure SSML rate -25%, not a stretched file). Loudness and silence
 * are normalized to m4a/aac 64 kbps, then uploaded. Paths land in items.audio.
 * `audio.source = "human"` is left alone.
 *
 * Flags: `--only-slow` plans slow clips only. `--force` replaces a path that
 * already exists. Together they regenerate slow files and skip narrator audio.
 *
 * After each unit, ffprobe checks that every slow clip is at least 1.2× the
 * matching normal clip. A short slow file stops the run and names the unit id.
 *
 * Keys stay in the environment:
 *   TTS_API_KEY, CONTENT_SUPABASE_URL, CONTENT_SUPABASE_KEY
 * Optional: TTS_PROVIDER (azure | google | openai, default azure),
 *   TTS_API_URL, TTS_AZURE_REGION
 */
import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import { publicAudioUrl } from '../../src/features/audio/storage';
import {
  isStoredAudioPath,
  type AudioPreference,
  type AudioSpeed,
} from '../../src/features/audio/select';
import { ItemSchema, type Item } from '../../src/features/content/schema';
import { decodeTtsPayload } from '../../src/features/content/pipeline/ssml';
import {
  applyAudioPaths,
  assertSlowLongerThanNormal,
  clipPath,
  parseTtsArgs,
  planItemClips,
  storageUploadRequest,
  type AudioPathUpdate,
  type PlannedClip,
} from '../../src/features/content/pipeline/tts';
import { ttsAdapter } from '../../src/features/content/pipeline/ttsProviders';

import { normalizeToM4a, probeDurationSeconds } from './ffmpeg';
import { putStorageBytes } from './put-storage';

type RenderedClip = { clip: PlannedClip; audio: Uint8Array };

async function main(): Promise<void> {
  const cli = parseTtsArgs(process.argv.slice(2));
  const provider = ttsAdapter(process.env.TTS_PROVIDER?.trim() || 'azure');
  const apiKey = requiredEnv('TTS_API_KEY');
  const supabaseUrl = requiredEnv('CONTENT_SUPABASE_URL');
  const storageKey = requiredEnv('CONTENT_SUPABASE_KEY');
  const region = process.env.TTS_AZURE_REGION?.trim() || undefined;
  const apiUrl = process.env.TTS_API_URL?.trim() || undefined;

  const root = process.cwd();
  const files = walkItemFiles(path.join(root, 'content/items'));
  let written = 0;

  for (const file of files) {
    const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    const items = z.array(ItemSchema).parse(raw);
    const updates: AudioPathUpdate[] = [];

    for (const item of items) {
      const rendered = new Map<string, RenderedClip>();
      for (const clip of planItemClips(item, cli)) {
        const request = provider.request({
          apiKey,
          apiUrl,
          region,
          text: clip.text,
          locale: clip.locale,
          speed: clip.speed,
        });
        const encoded = await postBytes(request, apiKey);
        const audio = decodeTtsPayload(encoded, provider.encoding);
        const m4a = await normalizeToM4a(audio);
        rendered.set(slotKey(clip.partIndex, clip.voice, clip.speed), { clip, audio: m4a });
      }

      await ensureSlowLonger(item, rendered, supabaseUrl);

      for (const { clip, audio } of rendered.values()) {
        // .m4a is sent as audio/mp4. That type is on the audio bucket allow-list.
        const upload = storageUploadRequest({
          supabaseUrl,
          apiKey: storageKey,
          objectPath: clip.objectPath,
        });
        await putStorageBytes(upload, audio, storageKey);
        updates.push({
          id: item.id,
          partIndex: clip.partIndex,
          voice: clip.voice,
          speed: clip.speed,
          path: clip.objectPath,
        });
      }
    }

    if (updates.length === 0) continue;
    fs.writeFileSync(file, `${JSON.stringify(applyAudioPaths(raw, updates), null, 2)}\n`);
    written += updates.length;
    console.log(`${path.relative(root, file)}: ${updates.length}`);
  }

  console.log(
    written === 0
      ? 'Нечего генерировать: клипы уже есть, либо запись диктора (source human).'
      : `Записано клипов: ${written}. Провайдер: ${provider.id}.`,
  );
}

function slotKey(
  partIndex: number | null,
  voice: AudioPreference,
  speed: AudioSpeed,
): string {
  return `${partIndex ?? 'phrase'}:${voice}:${speed}`;
}

/**
 * Each slow clip of this unit must be at least 1.2× its normal sibling.
 * A normal file synthesized in this run is probed from memory. Otherwise the
 * stored normal object is downloaded. The error includes the unit id.
 */
async function ensureSlowLonger(
  item: Item,
  rendered: ReadonlyMap<string, RenderedClip>,
  supabaseUrl: string,
): Promise<void> {
  for (const { clip, audio } of rendered.values()) {
    if (clip.speed !== 'slow') continue;
    const normal = await normalAudio(item, clip, rendered, supabaseUrl);
    let normalSeconds: number;
    let slowSeconds: number;
    try {
      normalSeconds = await probeDurationSeconds(normal);
      slowSeconds = await probeDurationSeconds(audio);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'ffprobe';
      throw new Error(`Единица ${item.id}: ${detail}`);
    }
    assertSlowLongerThanNormal(item.id, normalSeconds, slowSeconds);
  }
}

async function normalAudio(
  item: Item,
  slow: PlannedClip,
  rendered: ReadonlyMap<string, RenderedClip>,
  supabaseUrl: string,
): Promise<Uint8Array> {
  const fresh = rendered.get(slotKey(slow.partIndex, slow.voice, 'normal'));
  if (fresh) return fresh.audio;
  const stored = clipPath(item, slow.partIndex, slow.voice, 'normal');
  if (!stored || !isStoredAudioPath(stored)) {
    throw new Error(`Единица ${item.id}: нет обычной записи, чтобы сравнить медленную.`);
  }
  const url =
    stored.startsWith('http://') || stored.startsWith('https://')
      ? stored
      : publicAudioUrl(stored, supabaseUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Единица ${item.id}: не удалось прочитать обычную запись (${response.status}).`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim() ?? '';
  if (value) return value;
  throw new Error(`${name} не задан. Положите ключ в окружение, не в репозиторий и не в клиент.`);
}

async function postBytes(
  request: { url: string; headers: Record<string, string>; body?: string },
  secret: string,
): Promise<Uint8Array> {
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TTS API ${response.status}: ${redact(text, secret).slice(0, 300)}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join('[redacted]') : text;
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

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'tts failed';
  console.error(message);
  process.exitCode = 1;
});
