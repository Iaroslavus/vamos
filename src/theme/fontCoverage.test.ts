/**
 * @jest-environment node
 *
 * Headings and body text are registered by family name. If the file has no
 * glyph, React Native draws that character from the system font instead.
 */
import fs from 'fs';
import path from 'path';

import { fonts } from '@/theme/tokens';

const RUSSIAN = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
/** Letters Russian does not cover, plus the Ukrainian apostrophe U+2019. */
const UKRAINIAN = 'ҐґЄєІіЇї\u2019';
const SPANISH = 'ñÑáÁéÉíÍóÓúÚüÜ¿¡';
const REQUIRED = `${RUSSIAN}${UKRAINIAN}${SPANISH}`;

function findFontFile(family: string): string {
  const root = path.join(process.cwd(), 'node_modules', '@expo-google-fonts');
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir === undefined) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === `${family}.ttf`) return full;
    }
  }
  throw new Error(`font file not found for ${family}`);
}

function cmapCodepoints(file: string): Set<number> {
  const buf = fs.readFileSync(file);
  const numTables = buf.readUInt16BE(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    const tag = buf.toString('latin1', rec, rec + 4);
    if (tag === 'cmap') cmapOffset = buf.readUInt32BE(rec + 8);
  }
  if (cmapOffset < 0) throw new Error(`cmap table missing in ${file}`);

  const numSubtables = buf.readUInt16BE(cmapOffset + 2);
  const codepoints = new Set<number>();
  for (let i = 0; i < numSubtables; i += 1) {
    const rec = cmapOffset + 4 + i * 8;
    const offset = cmapOffset + buf.readUInt32BE(rec + 4);
    const format = buf.readUInt16BE(offset);
    if (format === 4) parseFormat4(buf, offset, codepoints);
    else if (format === 12) parseFormat12(buf, offset, codepoints);
  }
  return codepoints;
}

function parseFormat4(buf: Buffer, offset: number, codepoints: Set<number>): void {
  const segCount = buf.readUInt16BE(offset + 6) / 2;
  const endStart = offset + 14;
  const startStart = endStart + segCount * 2 + 2;
  const deltaStart = startStart + segCount * 2;
  const rangeStart = deltaStart + segCount * 2;
  for (let i = 0; i < segCount; i += 1) {
    const end = buf.readUInt16BE(endStart + i * 2);
    const start = buf.readUInt16BE(startStart + i * 2);
    const delta = buf.readInt16BE(deltaStart + i * 2);
    const rangeOffset = buf.readUInt16BE(rangeStart + i * 2);
    for (let code = start; code <= end && code < 0xffff; code += 1) {
      let glyph = 0;
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff;
      } else {
        const glyphIndexOffset = rangeStart + i * 2 + rangeOffset + (code - start) * 2;
        if (glyphIndexOffset + 2 <= buf.length) {
          glyph = buf.readUInt16BE(glyphIndexOffset);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
      }
      if (glyph !== 0) codepoints.add(code);
    }
  }
}

function parseFormat12(buf: Buffer, offset: number, codepoints: Set<number>): void {
  const groups = buf.readUInt32BE(offset + 12);
  let cursor = offset + 16;
  for (let i = 0; i < groups; i += 1) {
    const start = buf.readUInt32BE(cursor);
    const end = buf.readUInt32BE(cursor + 4);
    const glyph = buf.readUInt32BE(cursor + 8);
    cursor += 12;
    for (let code = start; code <= end; code += 1) {
      if (glyph + (code - start) !== 0) codepoints.add(code);
    }
  }
}

function missingGlyphs(family: string): string[] {
  const covered = cmapCodepoints(findFontFile(family));
  const missing: string[] = [];
  for (const ch of REQUIRED) {
    const code = ch.codePointAt(0);
    if (code === undefined || !covered.has(code)) {
      const hex = (code ?? 0).toString(16).toUpperCase().padStart(4, '0');
      missing.push(`${ch} U+${hex}`);
    }
  }
  return missing;
}

describe('font glyph coverage', () => {
  it.each(Object.values(fonts))('%s covers Russian, Ukrainian, and Spanish', (family) => {
    expect(missingGlyphs(family)).toEqual([]);
  });
});
