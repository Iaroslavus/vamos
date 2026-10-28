/**
 * Listen to the same ten starter-week phrases from two or three neural voices.
 * Files go to tmp/tts-compare/ and are not committed.
 *
 * Keys, each optional — a provider without a key is skipped:
 *   TTS_AZURE_KEY, TTS_GOOGLE_KEY, TTS_OPENAI_KEY
 * TTS_API_KEY is used for TTS_PROVIDER (default azure) when that provider's key is empty.
 * Optional: TTS_AZURE_REGION, TTS_API_URL
 */
import fs from 'fs';
import path from 'path';

import { loadContent } from '../../src/features/content/pipeline/load';
import { compareClipName, comparePhrases } from '../../src/features/content/pipeline/compare';
import { decodeTtsPayload } from '../../src/features/content/pipeline/ssml';
import {
  TTS_PROVIDER_IDS,
  ttsAdapter,
  type TtsProviderId,
} from '../../src/features/content/pipeline/ttsProviders';

import { normalizeToM4a } from './ffmpeg';

const KEY_ENV: Record<TtsProviderId, string> = {
  azure: 'TTS_AZURE_KEY',
  google: 'TTS_GOOGLE_KEY',
  openai: 'TTS_OPENAI_KEY',
};

async function main(): Promise<void> {
  const ready = TTS_PROVIDER_IDS.flatMap((id) => {
    const apiKey = keyFor(id);
    return apiKey ? [{ id, apiKey }] : [];
  });
  if (ready.length === 0) {
    throw new Error(
      'Нет ключей. Задайте TTS_AZURE_KEY, TTS_GOOGLE_KEY и/или TTS_OPENAI_KEY в окружении.',
    );
  }
  const skipped = TTS_PROVIDER_IDS.filter((id) => !ready.some((row) => row.id === id));
  if (skipped.length > 0) {
    console.log(`Пропущены провайдеры без ключа: ${skipped.join(', ')}`);
  }

  const phrases = comparePhrases(loadContent(process.cwd()).bundle, 10);
  if (phrases.length === 0) throw new Error('В первой неделе нет фраз.');

  const root = path.join(process.cwd(), 'tmp/tts-compare');
  fs.mkdirSync(root, { recursive: true });
  const region = process.env.TTS_AZURE_REGION?.trim() || undefined;
  const apiUrl = process.env.TTS_API_URL?.trim() || undefined;
  const lines = [
    'Сравнение голосов. Первая неделя, обычная скорость, es-ES.',
    'Файлы локальные, в репозиторий не входят.',
    '',
  ];

  for (const [index, phrase] of phrases.entries()) {
    lines.push(`${index + 1}. ${phrase.id}: ${phrase.es}`);
    for (const row of ready) {
      const provider = ttsAdapter(row.id);
      const request = provider.request({
        apiKey: row.apiKey,
        apiUrl,
        region,
        text: phrase.es,
        locale: 'es-ES',
        speed: 'normal',
      });
      const encoded = await postBytes(request, row.apiKey);
      const audio = decodeTtsPayload(encoded, provider.encoding);
      const m4a = await normalizeToM4a(audio);
      const name = compareClipName(index, phrase.id, provider.id);
      fs.writeFileSync(path.join(root, name), m4a);
      lines.push(`   ${name}`);
      console.log(name);
    }
  }

  fs.writeFileSync(path.join(root, 'manifest.txt'), `${lines.join('\n')}\n`);
  console.log(`Готово: ${root} (${phrases.length} фраз × ${ready.length} провайдеров).`);
}

function keyFor(id: TtsProviderId): string {
  const dedicated = process.env[KEY_ENV[id]]?.trim() ?? '';
  if (dedicated) return dedicated;
  const selected = process.env.TTS_PROVIDER?.trim() || 'azure';
  if (selected === id) return process.env.TTS_API_KEY?.trim() ?? '';
  return '';
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

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'tts compare failed';
  console.error(message);
  process.exitCode = 1;
});
