/**
 * Score a folder of WAV takes against one unit's reference JSON.
 * Use it to tune the thresholds in src/features/speech/acoustic/config.ts.
 *
 *   npx tsx scripts/speech/acoustic-test.ts ./takes --features path/to/unit.features.json --phrase "hola"
 */
import fs from 'fs';
import path from 'path';

import { assessRecording } from '../../src/features/speech/acoustic/assess';
import { ACOUSTIC } from '../../src/features/speech/acoustic/config';
import { parseUnitFeatures } from '../../src/features/speech/acoustic/reference';
import { decodeWavPcm } from '../../src/features/speech/acoustic/wav';

type Row = {
  file: string;
  similarity: string;
  noiseMs: string;
  rules: string;
};

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const features = parseUnitFeatures(fs.readFileSync(args.features, 'utf8'));
  const files = wavFiles(args.directory);
  if (files.length === 0) throw new Error(`В ${args.directory} нет WAV.`);

  const rows: Row[] = files.map((file) => {
    const decoded = decodeWavPcm(new Uint8Array(fs.readFileSync(file)));
    const result = assessRecording(decoded.samples, features, args.phrase);
    const fired = result.findings.map((finding) =>
      finding.kind === 'expected' ? `${finding.id}*` : finding.id,
    );
    return {
      file: path.basename(file),
      similarity: result.similarity === null ? '—' : String(result.similarity),
      noiseMs: String(result.noiseBeforeVowelMs),
      rules: fired.length === 0 ? '—' : fired.join(', '),
    };
  });

  console.log(
    `Фраза: ${args.phrase}. Порог шума ${ACOUSTIC.noiseBeforeVowelMs} мс, ` +
      `zcr ≥ ${ACOUSTIC.zcrNoise}, доля ВЧ ≥ ${ACOUSTIC.hfShare}. ` +
      `* — шум ожидается, это не ошибка.`,
  );
  printTable(rows);
}

function printTable(rows: readonly Row[]): void {
  const header: Row = {
    file: 'файл',
    similarity: 'похожесть',
    noiseMs: 'шум_мс',
    rules: 'правила',
  };
  const all = [header, ...rows];
  const width = {
    file: Math.max(...all.map((row) => row.file.length)),
    similarity: Math.max(...all.map((row) => row.similarity.length)),
    noiseMs: Math.max(...all.map((row) => row.noiseMs.length)),
    rules: Math.max(...all.map((row) => row.rules.length)),
  };
  for (const row of all) {
    console.log(
      [
        row.file.padEnd(width.file),
        row.similarity.padStart(width.similarity),
        row.noiseMs.padStart(width.noiseMs),
        row.rules.padEnd(width.rules),
      ].join('  '),
    );
  }
}

function wavFiles(directory: string): string[] {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Нет папки ${directory}.`);
  }
  return fs
    .readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith('.wav'))
    .sort()
    .map((name) => path.join(directory, name));
}

function parseArgs(argv: readonly string[]): {
  directory: string;
  features: string;
  phrase: string;
} {
  let directory = '';
  let features = '';
  let phrase = '';
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? '';
    if (arg === '--features') features = argv[++index] ?? '';
    else if (arg === '--phrase') phrase = argv[++index] ?? '';
    else if (arg.startsWith('--')) throw new Error(`Неизвестный аргумент ${arg}`);
    else if (!directory) directory = arg;
    else throw new Error(`Лишний аргумент ${arg}`);
  }
  if (!directory || !features || !phrase) {
    throw new Error('Нужны папка WAV, --features путь-к-json и --phrase «испанская фраза».');
  }
  return { directory, features, phrase };
}

main();
