import type { Item, Lesson, LocalizedText } from './schema';

export type QualityBundle = {
  items: readonly Item[];
  lessons: readonly Lesson[];
};

/**
 * A single Spanish word that is a verb form, and the infinitive its note must name.
 * Nouns and greetings are not in this list.
 */
export const VERB_INFINITIVE: Readonly<Record<string, string>> = {
  soy: 'ser',
  eres: 'ser',
  estoy: 'estar',
  está: 'estar',
  estan: 'estar',
  están: 'estar',
  tengo: 'tener',
  tienes: 'tener',
  tiene: 'tener',
  quiero: 'querer',
  quieres: 'querer',
  quiere: 'querer',
  quisiera: 'querer',
  vivo: 'vivir',
  vives: 'vivir',
  vive: 'vivir',
  llamo: 'llamar',
  llamas: 'llamar',
  puedo: 'poder',
  puede: 'poder',
  hago: 'hacer',
  voy: 'ir',
  vas: 'ir',
  hay: 'haber',
  digo: 'decir',
  sé: 'saber',
};

const NUMBER_WORD: Readonly<Record<string, string>> = {
  cero: '0',
  uno: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  diez: '10',
};

const TENS = new Set([
  'veinte',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
]);

const UNITS = new Set([
  'uno',
  'una',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
]);

const CARDINALS = new Set([
  ...Object.keys(NUMBER_WORD),
  'una',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'dieciseis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  ...TENS,
  'cien',
  'ciento',
  'mil',
]);

/** A 0–10 card does not count toward the lesson's separate-word cap. */
export function isNumberCard(item: Item): boolean {
  return numberDigit(item.es) !== null;
}

/**
 * Several number words joined by a comma or by «y».
 * A compound such as «treinta y dos» is one number.
 * «dos con cincuenta» is not joined by «y», so it stays.
 */
export function hasNumberList(es: string): boolean {
  const tokens = es
    .toLowerCase()
    .split(/[^a-záéíóúüñ0-9]+/i)
    .filter((token) => token.length > 0);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (isNumberToken(tokens[index] ?? '') && isNumberToken(tokens[index + 1] ?? '')) return true;
  }
  for (let index = 1; index < tokens.length - 1; index += 1) {
    if (tokens[index] !== 'y') continue;
    const left = tokens[index - 1] ?? '';
    const right = tokens[index + 1] ?? '';
    if (!isNumberToken(left) || !isNumberToken(right)) continue;
    if (TENS.has(left) && UNITS.has(right)) continue;
    return true;
  }
  return false;
}

/** Questions need both ¿ and ?. Exclamations need both ¡ and !. */
export function punctuationIssue(es: string): string | null {
  const openQuestion = es.includes('¿');
  const closeQuestion = es.includes('?');
  const openBang = es.includes('¡');
  const closeBang = es.includes('!');
  if (openQuestion !== closeQuestion) return 'question marks must include ¿ and ?';
  if (openBang !== closeBang) return 'exclamation marks must include ¡ and !';
  return null;
}

export function qualityIssues(bundle: QualityBundle): string[] {
  const issues: string[] = [];
  for (const item of bundle.items) {
    issues.push(...itemIssues(item));
  }
  for (const lesson of bundle.lessons) {
    for (const line of lesson.dialog.lines) {
      if (line.who !== 'npc') continue;
      const marks = punctuationIssue(line.es);
      if (marks) issues.push(`lesson ${lesson.id} npc «${line.es}»: ${marks}`);
    }
  }
  return issues;
}

function itemIssues(item: Item): string[] {
  const issues: string[] = [];
  const marks = punctuationIssue(item.es);
  if (marks) issues.push(`item ${item.id}: ${marks}`);
  if (item.forms) {
    for (const gender of ['m', 'f'] as const) {
      const formMarks = punctuationIssue(item.forms[gender].es);
      if (formMarks) issues.push(`item ${item.id} form ${gender}: ${formMarks}`);
    }
  }

  const verb = verbInfinitive(item.es);
  if (verb && !noteHasInfinitive(item.note, verb)) {
    issues.push(
      `item ${item.id} is the verb «${item.es.trim()}» but note has no infinitive ${verb}`,
    );
  }

  if (hasNumberList(item.es)) {
    issues.push(`item ${item.id} lists several numbers in «${item.es}»`);
  }
  for (const gender of ['m', 'f'] as const) {
    const formEs = item.forms?.[gender].es;
    if (formEs && hasNumberList(formEs)) {
      issues.push(`item ${item.id} form ${gender} lists several numbers in «${formEs}»`);
    }
  }

  const digit = numberDigit(item.es);
  if (digit && item.display !== digit) {
    issues.push(`item ${item.id} is the number ${digit} and needs display «${digit}»`);
  }

  for (const hit of forbiddenMarks(item)) issues.push(hit);
  return issues;
}

function verbInfinitive(es: string): string | null {
  const token = es.trim().toLowerCase();
  if (token.split(/\s+/).length !== 1) return null;
  return VERB_INFINITIVE[token] ?? null;
}

function noteHasInfinitive(note: LocalizedText | null, infinitive: string): boolean {
  if (!note) return false;
  return [note.ru, note.uk, note.en].some((line) => line?.toLowerCase().includes(infinitive));
}

function numberDigit(es: string): string | null {
  const token = es
    .trim()
    .toLowerCase()
    .replace(/^[¿¡]+|[?!.,]+$/g, '');
  if (token.split(/\s+/).length !== 1) return null;
  return NUMBER_WORD[token] ?? null;
}

function isNumberToken(token: string): boolean {
  return CARDINALS.has(token) || /^\d+$/.test(token);
}

const MARK = /[/()]/;

function forbiddenMarks(item: Item): string[] {
  const issues: string[] = [];
  const spanish = [item.es, ...item.parts.map((part) => part.es)];
  if (item.forms) spanish.push(item.forms.m.es, item.forms.f.es);
  for (const text of spanish) {
    if (MARK.test(text)) issues.push(`item ${item.id} has / or parentheses in es «${text}»`);
  }
  const translations: LocalizedText[] = [item.tr];
  if (item.literal) translations.push(item.literal);
  for (const part of item.parts) translations.push(part.tr);
  if (item.forms) translations.push(item.forms.m.tr, item.forms.f.tr);
  for (const text of translations) {
    for (const line of [text.ru, text.uk, text.en]) {
      if (line && MARK.test(line)) {
        issues.push(`item ${item.id} has / or parentheses in a translation «${line}»`);
      }
    }
  }
  return issues;
}
