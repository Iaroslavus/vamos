/**
 * Turn provider audio into m4a/aac: loudness, trimmed silence, 64 kbps.
 * ffmpeg must be on PATH. The synthesizer already chose the speaking rate.
 */
import { spawn } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

import { normalizeAudioArgs } from '../../src/features/content/pipeline/ssml';

export async function normalizeToM4a(input: Uint8Array): Promise<Uint8Array> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'vamos-tts-'));
  const source = path.join(dir, 'in.mp3');
  const target = path.join(dir, 'out.m4a');
  try {
    await writeFile(source, input);
    await runFfmpeg(normalizeAudioArgs(source, target));
    return new Uint8Array(await readFile(target));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (chunk: Buffer) => {
      err = (err + chunk.toString()).slice(-2000);
    });
    child.on('error', () => {
      reject(new Error('ffmpeg не найден. Установите ffmpeg, чтобы собрать m4a/aac 64 кбит/с.'));
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg завершился с кодом ${code ?? '?'}: ${err.slice(-400)}`));
    });
  });
}
