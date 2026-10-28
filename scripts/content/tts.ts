/**
 * Neural TTS for every unit and every part.
 *
 * For variant both / es / latam: es-ES and es-MX as required, normal speed and
 * slow speed (SSML rate 75%, not a stretched file). Loudness and silence are
 * normalized to m4a/aac 64 kbps, then uploaded. Paths land in items.audio.
 * `audio.source = "human"` is left alone.
 *
 * Keys stay in the environment:
 *   TTS_API_KEY, CONTENT_SUPABASE_URL, CONTENT_SUPABASE_KEY
 * Optional: TTS_PROVIDER (azure | google | openai, default azure),
 *   TTS_API_URL, TTS_AZURE_REGION
 */
import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import { ItemSchema } from '../../src/features/content/schema';
import { decodeTtsPayload } from '../../src/features/content/pipeline/ssml';
import {
  applyAudioPaths,
  planItemClips,
  storageUploadRequest,
  type AudioPathUpdate,
} from '../../src/features/content/pipeline/tts';
import { ttsAdapter } from '../../src/features/content/pipeline/ttsProviders';

import { normalizeToM4a } from './ffmpeg';
import { putStorageBytes } from './put-storage';

async function main(): Promise<void> {
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
      for (const clip of planItemClips(item)) {
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
        // .m4a is sent as audio/mp4. That type is on the audio bucket allow-list.
        const upload = storageUploadRequest({
          supabaseUrl,
          apiKey: storageKey,
          objectPath: clip.objectPath,
        });
        await putStorageBytes(upload, m4a, storageKey);
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
