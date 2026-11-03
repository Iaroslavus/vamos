import { ACOUSTIC } from './config';
import { dtwAverageCost, dtwSimilarity } from './dtw';
import { mfccFeatures, type FeatureMatrix } from './mfcc';
import {
  applyFeaturesPaths,
  encodeDrafts,
  featuresObjectPath,
  parseUnitFeatures,
} from './reference';
import {
  acousticFindings,
  expectsVelarFricative,
  startsWithSilentH,
  startsWithVowel,
} from './rules';
import { noiseBeforeVowelMs, trimSilence, zeroCrossingRate } from './signal';
import { assessRecording, combinePronunciationScore, passesAcoustic } from './assess';
import { decodeWavPcm, encodeWavPcm16 } from './wav';

const RATE = ACOUSTIC.sampleRate;

function concat(parts: readonly Float32Array[]): Float32Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Float32Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function silence(ms: number): Float32Array {
  return new Float32Array(Math.round((RATE * ms) / 1000));
}

/** A few harmonics. Low zero-crossing rate, almost no energy above 2.5 kHz. */
function vowel(ms: number, frequency = 180, amplitude = 0.55): Float32Array {
  const length = Math.round((RATE * ms) / 1000);
  const out = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const time = index / RATE;
    out[index] =
      amplitude *
      (Math.sin(2 * Math.PI * frequency * time) +
        0.35 * Math.sin(2 * Math.PI * frequency * 2 * time) +
        0.15 * Math.sin(2 * Math.PI * frequency * 3 * time));
  }
  return out;
}

/** White noise. High zero-crossing rate and a large high-frequency share. */
function hiss(ms: number, amplitude = 0.4, seed = 19): Float32Array {
  const length = Math.round((RATE * ms) / 1000);
  const out = new Float32Array(length);
  let state = seed;
  for (let index = 0; index < length; index += 1) {
    state = (state * 16807) % 2147483647;
    out[index] = ((state / 2147483647) * 2 - 1) * amplitude;
  }
  return out;
}

function ramp(count: number, width = 4): FeatureMatrix {
  return Array.from({ length: count }, (_, time) => {
    const row = new Float64Array(width);
    for (let column = 0; column < width; column += 1) {
      row[column] = Math.sin(((time + 1) * (column + 1)) / 6);
    }
    return row;
  });
}

describe('wav pcm', () => {
  it('round-trips 16-bit mono and downmixes a stereo header', () => {
    const original = vowel(80);
    const decoded = decodeWavPcm(encodeWavPcm16(original));
    expect(decoded.sampleRate).toBe(RATE);
    expect(decoded.samples.length).toBe(original.length);
    let error = 0;
    for (let index = 0; index < original.length; index += 1) {
      error = Math.max(error, Math.abs((decoded.samples[index] ?? 0) - (original[index] ?? 0)));
    }
    expect(error).toBeLessThan(1 / 16000);
  });

  it('resamples a 8 kHz file up to 16 kHz', () => {
    const original = vowel(100);
    const decoded = decodeWavPcm(encodeWavPcm16(original, 8000));
    expect(decoded.sampleRate).toBe(RATE);
    expect(decoded.samples.length).toBeGreaterThan(original.length);
  });
});

describe('speech energy', () => {
  it('drops leading and trailing silence and keeps the vowel', () => {
    const trimmed = trimSilence(concat([silence(200), vowel(300), silence(220)]));
    const ms = (trimmed.length / RATE) * 1000;
    expect(ms).toBeGreaterThan(250);
    expect(ms).toBeLessThan(420);
  });

  it('treats digital silence as no speech', () => {
    expect(trimSilence(silence(400)).length).toBe(0);
  });
});

describe('onset noise', () => {
  it('hears a long hiss before the vowel and ignores a short one', () => {
    const vowelFrame = vowel(40);
    const noiseFrame = hiss(40);
    expect(zeroCrossingRate(noiseFrame)).toBeGreaterThan(ACOUSTIC.zcrNoise);
    expect(zeroCrossingRate(vowelFrame)).toBeLessThan(ACOUSTIC.zcrNoise);

    const longNoise = noiseBeforeVowelMs(concat([hiss(80), vowel(350)]));
    const shortNoise = noiseBeforeVowelMs(concat([hiss(20), vowel(350)]));
    const clean = noiseBeforeVowelMs(vowel(350));

    expect(longNoise).toBeGreaterThan(ACOUSTIC.noiseBeforeVowelMs);
    expect(shortNoise).toBeLessThanOrEqual(ACOUSTIC.noiseBeforeVowelMs);
    expect(clean).toBeLessThanOrEqual(ACOUSTIC.noiseBeforeVowelMs);
  });

  it('flags an aspirated h or an initial vowel, and expects noise for j and ge/gi', () => {
    const aspirated = concat([hiss(80), vowel(350)]);
    const clean = vowel(350);

    expect(startsWithSilentH('Hola')).toBe(true);
    expect(startsWithVowel('amigo')).toBe(true);
    expect(expectsVelarFricative('jugo')).toBe(true);
    expect(expectsVelarFricative('gente')).toBe(true);
    expect(expectsVelarFricative('gato')).toBe(false);

    expect(acousticFindings('hola', { noiseBeforeVowelMs: 80 }).map((hit) => hit.id)).toEqual([
      'silent-h',
    ]);
    expect(acousticFindings('amigo', { noiseBeforeVowelMs: 80 }).map((hit) => hit.id)).toEqual([
      'silent-h',
    ]);
    expect(acousticFindings('jugo', { noiseBeforeVowelMs: 80 }).map((hit) => hit.id)).toEqual([
      'jota',
    ]);
    expect(acousticFindings('gente', { noiseBeforeVowelMs: 80 })[0]?.kind).toBe('expected');
    expect(acousticFindings('gato', { noiseBeforeVowelMs: 80 })).toEqual([]);
    expect(acousticFindings('hola', { noiseBeforeVowelMs: 20 })).toEqual([]);

    const flagged = assessRecording(aspirated, null, 'hola');
    expect(flagged.findings.map((hit) => hit.id)).toEqual(['silent-h']);
    expect(flagged.penalty).toBe(ACOUSTIC.rulePenalty);
    expect(assessRecording(aspirated, null, 'jugo').findings.map((hit) => hit.id)).toEqual([
      'jota',
    ]);
    expect(assessRecording(clean, null, 'hola').findings).toEqual([]);
  });
});

describe('dtw', () => {
  const sequence = ramp(36);

  it('matches a shifted or stretched copy and rejects a different shape', () => {
    const stretched = sequence.flatMap((frame) => [frame, frame]);
    const shifted = [...ramp(8).map(() => sequence[0] ?? new Float64Array()), ...sequence];
    const different = sequence.map((frame) => {
      const row = new Float64Array(frame.length);
      for (let index = 0; index < frame.length; index += 1) row[index] = -(frame[index] ?? 0) + 3;
      return row;
    });

    expect(dtwAverageCost(sequence, sequence)).toBe(0);
    expect(dtwAverageCost(sequence, stretched)).toBe(0);
    expect(dtwSimilarity(sequence, sequence)).toBe(100);
    expect(dtwSimilarity(sequence, stretched)).toBeGreaterThanOrEqual(95);
    expect(dtwSimilarity(sequence, shifted)).toBeGreaterThanOrEqual(90);
    expect(dtwSimilarity(sequence, different)).toBeLessThan(dtwSimilarity(sequence, shifted) - 15);
  });

  it('keeps the pass bar at the configured score', () => {
    expect(ACOUSTIC.passScore).toBe(70);
    expect(passesAcoustic(70)).toBe(true);
    expect(passesAcoustic(69)).toBe(false);
  });
});

describe('score mix', () => {
  it('weights the text check and the best acoustic match, then applies a rule penalty', () => {
    const mixed = combinePronunciationScore(100, 50);
    const expected = Math.round(
      (ACOUSTIC.textWeight * 100 + ACOUSTIC.acousticWeight * 50) /
        (ACOUSTIC.textWeight + ACOUSTIC.acousticWeight),
    );
    expect(mixed).toBe(expected);
    expect(combinePronunciationScore(80, null)).toBe(80);
    expect(combinePronunciationScore(100, 100, ACOUSTIC.rulePenalty)).toBe(
      100 - ACOUSTIC.rulePenalty,
    );
  });
});

describe('reference json', () => {
  it('stores both genders beside the audio path and stays under 10 KB', () => {
    expect(featuresObjectPath({ id: 'cafe.hola', level: 'A1' })).toBe(
      'items/a1/cafe/hola.features.json',
    );
    const json = encodeDrafts([
      { locale: 'es-ES', gender: 'female', samples: vowel(1600) },
      { locale: 'es-MX', gender: 'male', samples: vowel(1600, 140) },
    ]);
    expect(new TextEncoder().encode(json).length).toBeLessThan(ACOUSTIC.maxFeatureBytes);
    const parsed = parseUnitFeatures(json);
    expect(parsed.voices.map((voice) => `${voice.locale}:${voice.gender}`)).toEqual([
      'es-ES:female',
      'es-MX:male',
    ]);

    const live = mfccFeatures(trimSilence(vowel(1600)));
    const female = parsed.voices[0]?.frames ?? [];
    const male = parsed.voices[1]?.frames ?? [];
    expect(dtwSimilarity(live, female)).toBeGreaterThan(dtwSimilarity(live, male));

    const written = applyFeaturesPaths(
      [{ id: 'cafe.hola', audio: { es: 'items/a1/cafe/hola.es.normal.m4a' } }],
      [{ id: 'cafe.hola', path: 'items/a1/cafe/hola.features.json' }],
    );
    expect(written).toEqual([
      {
        id: 'cafe.hola',
        audio: {
          es: 'items/a1/cafe/hola.es.normal.m4a',
          features: 'items/a1/cafe/hola.features.json',
        },
      },
    ]);
  });
});

describe('recording budget', () => {
  it('scores three seconds against a reference in under 300 ms', () => {
    const samples = vowel(3000);
    const references = parseUnitFeatures(
      encodeDrafts([{ locale: 'es-ES', gender: 'female', samples }]),
    );
    const started = performance.now();
    const result = assessRecording(samples, references, 'hola');
    const elapsed = performance.now() - started;
    expect(result.similarity).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(300);
  });
});
