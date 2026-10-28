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

/** Duration in seconds via ffprobe. The bytes are the normalized m4a. */
export async function probeDurationSeconds(audio: Uint8Array): Promise<number> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'vamos-tts-probe-'));
  const file = path.join(dir, 'clip.m4a');
  try {
    await writeFile(file, audio);
    const output = await runFfprobe([
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    const seconds = Number(output.trim());
    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new Error(`ffprobe не вернул длительность: ${output.trim().slice(0, 80)}`);
    }
    return seconds;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      err = (err + chunk.toString()).slice(-2000);
    });
    child.on('error', () => {
      reject(new Error('ffprobe не найден. Установите ffmpeg, чтобы проверить длительность.'));
    });
    child.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`ffprobe завершился с кодом ${code ?? '?'}: ${err.slice(-400)}`));
    });
  });
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
