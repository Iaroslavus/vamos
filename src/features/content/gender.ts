import { normalizeForCompare } from '@/features/lesson/grading';

import type { AddressForm } from '@/features/learner/profile';
import { selectClip, type AudioPreference, type AudioSpeed } from '@/features/audio/select';

import type { Audio, GenderForms, Item, LocalizedText } from './schema';

export type GenderChange = {
  id: string;
  before: { es: string; ru: string; uk: string; en: string };
  after: { es: string; ru: string; uk: string; en: string };
};

const PAREN = /(\p{L}+)\(([^)]+)\)/gu;

/** Text the synthesizer may read. A slash or a parenthesis is a content error. */
export function speakableText(text: string, name = 'Ana'): string {
  const spoken = text.includes('{name}') ? text.replaceAll('{name}', name) : text;
  if (/[/()]/.test(spoken)) {
    throw new Error(`TTS text must not contain / or parentheses: ${spoken}`);
  }
  return spoken;
}

/**
 * Split a slash pair or a gender parenthesis into two lines.
 * «encantado / encantada», «рад(а)», «радий(а)», «хотів(ла)».
 * Returns null when the string is already one line.
 */
export function splitGenderText(text: string): { m: string; f: string } | null {
  if (text.includes('/')) {
    const parts = text.split('/').map((part) => part.trim());
    const masculine = parts[0];
    const feminine = parts[1];
    if (!masculine || !feminine || parts.length !== 2) return null;
    return { m: masculine, f: feminine };
  }
  if (!text.includes('(')) return null;
  const masculine = applyGenderParen(text, false);
  const feminine = applyGenderParen(text, true);
  if (masculine === feminine || /[()/]/.test(masculine) || /[()/]/.test(feminine)) return null;
  return { m: masculine, f: feminine };
}

export function migrateGenderItem(item: Item): { item: Item; change: GenderChange | null } {
  const prepared = stripSpeakerGlosses(item);
  const before = gloss(item.es, item.tr);
  const esPair = splitGenderText(prepared.es);
  const trPair = splitLocalized(prepared.tr);
  const literalPair = prepared.literal ? splitLocalized(prepared.literal) : null;
  const sayPair = prepared.say ? splitLocalized(prepared.say) : null;
  const partPair = (prepared.parts ?? []).some(
    (part) => splitGenderText(part.es) !== null || splitLocalized(part.tr) !== null,
  );
  if (!esPair && !trPair && !literalPair && !sayPair && !partPair) {
    const changed = JSON.stringify(prepared) !== JSON.stringify(item);
    return {
      item: changed ? prepared : item,
      change: changed ? { id: item.id, before, after: gloss(prepared.es, prepared.tr) } : null,
    };
  }

  const masculineEs = esPair?.m ?? prepared.es;
  const feminineEs = esPair?.f ?? masculineEs;
  const masculineTr = trPair?.m ?? prepared.tr;
  const feminineTr = trPair?.f ?? masculineTr;
  const forms: GenderForms = {
    m: { es: masculineEs, tr: masculineTr },
    f: { es: feminineEs, tr: feminineTr },
  };
  const literal = literalPair?.m ?? prepared.literal;
  const next: Item = {
    ...prepared,
    es: masculineEs,
    tr: masculineTr,
    literal: literal && !sameText(literal, masculineTr) ? literal : null,
    say: sayPair?.m ?? prepared.say,
    forms,
    parts: (prepared.parts ?? [])
      .map((part) => ({
        es: splitGenderText(part.es)?.m ?? part.es,
        tr: splitLocalized(part.tr)?.m ?? part.tr,
      }))
      .filter((part) => part.es.length > 0),
  };
  if (esPair && next.audio) {
    next.audio = {
      ...next.audio,
      es: null,
      latam: null,
      slow: { es: null, latam: null },
      parts: [],
      features: null,
    };
  }
  return {
    item: next,
    change: { id: item.id, before, after: gloss(next.es, next.tr) },
  };
}

export type SpokenLine = {
  id: string;
  es: string;
  tr: LocalizedText;
  audio: string | null;
};

/**
 * Lines the lesson shows and listens for.
 * «both» is two rows. A chosen gender is that row. A phrase without forms is one row.
 */
export function spokenLines(
  item: Item,
  address: AddressForm,
  name: string | null,
  preference: AudioPreference = 'es',
  speed: AudioSpeed = 'normal',
): SpokenLine[] {
  const speaker = fallbackName(name, address);
  if (!item.forms) {
    return [
      lineOf(item.id, fillName(item.es, speaker), item.tr, item.audio, preference, speed, item.es),
    ];
  }
  const masculine = lineOf(
    `${item.id}.m`,
    fillName(item.forms.m.es, speaker),
    item.forms.m.tr,
    item.audio,
    preference,
    speed,
    item.forms.m.es,
  );
  const feminineTrack = item.audio.forms?.f;
  const feminineAudio: Audio = feminineTrack
    ? { ...item.audio, ...feminineTrack, parts: [], features: null }
    : {
        ...item.audio,
        es: null,
        latam: null,
        slow: { es: null, latam: null },
        parts: [],
        features: null,
      };
  const feminine = lineOf(
    `${item.id}.f`,
    fillName(item.forms.f.es, speaker),
    item.forms.f.tr,
    feminineAudio,
    preference,
    speed,
    item.forms.f.es,
  );
  if (address === 'm') return [masculine];
  if (address === 'f') return [feminine];
  return [masculine, feminine];
}

export function fallbackName(name: string | null | undefined, address: AddressForm): string {
  const custom = name?.trim();
  if (custom) return custom;
  return address === 'm' ? 'Pablo' : 'Ana';
}

export function fillName(text: string, name: string): string {
  return text.includes('{name}') ? text.replaceAll('{name}', name) : text;
}

function lineOf(
  id: string,
  es: string,
  tr: LocalizedText,
  audio: Audio,
  preference: AudioPreference,
  speed: AudioSpeed,
  template: string,
): SpokenLine {
  const recorded = speakableText(template, 'Ana');
  const clip =
    normalizeForCompare(es) === normalizeForCompare(recorded)
      ? selectClip(audio, preference, speed)
      : null;
  return { id, es, tr, audio: clip };
}

function applyGenderParen(text: string, feminine: boolean): string {
  const next = text.replace(PAREN, (_match, word: string, suffix: string) => {
    if (!feminine) return word;
    if (suffix === 'а' || suffix === 'a') {
      if (word.endsWith('ий')) return `${word.slice(0, -2)}а`;
      return `${word}${suffix}`;
    }
    if (suffix === 'ла' && word.endsWith('в')) return `${word.slice(0, -1)}ла`;
    return `${word}${suffix}`;
  });
  return next.replace(/\s{2,}/g, ' ').trim();
}

function splitLocalized(text: LocalizedText): { m: LocalizedText; f: LocalizedText } | null {
  const ru = text.ru ? splitGenderText(text.ru) : null;
  const uk = text.uk ? splitGenderText(text.uk) : null;
  const en = text.en ? splitGenderText(text.en) : null;
  if (!ru && !uk && !en) return null;
  return {
    m: {
      ru: ru?.m ?? text.ru,
      uk: uk?.m ?? text.uk,
      en: en?.m ?? text.en,
    },
    f: {
      ru: ru?.f ?? text.ru,
      uk: uk?.f ?? text.uk,
      en: en?.f ?? text.en,
    },
  };
}

function stripSpeakerGloss(text: string): string {
  return text
    .replace(/\s*\((?:[mf]\. pl\.|[mf]\.)\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripLocalizedGloss(text: LocalizedText): LocalizedText {
  return {
    ru: text.ru ? stripSpeakerGloss(text.ru) : undefined,
    uk: text.uk ? stripSpeakerGloss(text.uk) : undefined,
    en: text.en ? stripSpeakerGloss(text.en) : undefined,
  };
}

function stripSpeakerGlosses(item: Item): Item {
  return {
    ...item,
    es: stripSpeakerGloss(item.es),
    tr: stripLocalizedGloss(item.tr),
    literal: item.literal ? stripLocalizedGloss(item.literal) : item.literal,
    say: item.say ? stripLocalizedGloss(item.say) : item.say,
    parts: item.parts
      ? item.parts.map((part) => ({
          es: stripSpeakerGloss(part.es),
          tr: stripLocalizedGloss(part.tr),
        }))
      : item.parts,
  };
}

function sameText(left: LocalizedText, right: LocalizedText): boolean {
  return left.ru === right.ru && left.uk === right.uk && left.en === right.en;
}

function gloss(es: string, tr: LocalizedText): GenderChange['before'] {
  return { es, ru: tr.ru ?? '', uk: tr.uk ?? '', en: tr.en ?? '' };
}
