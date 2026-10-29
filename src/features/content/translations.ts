import type { ContentBundle } from './integrity';
import type { LocalizedText } from './schema';
import { CONTENT_LOCALES, type ContentLocale } from './text';

export type TranslationGap = {
  locale: ContentLocale;
  /** Where the string lives, for example `item hola.hola tr`. */
  ref: string;
};

/** Every localized field that has no wording in a language. A null note or why is not a gap. */
export function translationGaps(bundle: ContentBundle): TranslationGap[] {
  const gaps: TranslationGap[] = [];

  for (const item of bundle.items) {
    missing(item.tr, `item ${item.id} tr`, gaps);
    missing(item.literal, `item ${item.id} literal`, gaps);
    missing(item.say, `item ${item.id} say`, gaps);
    missing(item.note, `item ${item.id} note`, gaps);
    missing(item.why, `item ${item.id} why`, gaps);
    item.parts.forEach((part, index) => {
      missing(part.tr, `item ${item.id} parts[${index}].tr`, gaps);
    });
  }

  for (const topic of bundle.topics) {
    missing(topic.title, `topic ${topic.id} title`, gaps);
    topic.can_do.forEach((goal, index) => {
      missing(goal, `topic ${topic.id} can_do[${index}]`, gaps);
    });
  }

  for (const lesson of bundle.lessons) {
    missing(lesson.title, `lesson ${lesson.id} title`, gaps);
    lesson.dialog.lines.forEach((line, index) => {
      if (line.who === 'npc') missing(line.tr, `lesson ${lesson.id} dialog[${index}].tr`, gaps);
    });
    lesson.overrides.forEach((override, index) => {
      missing(override.prompt, `lesson ${lesson.id} overrides[${index}].prompt`, gaps);
    });
  }

  for (const scene of bundle.scenes) {
    missing(scene.title, `scene ${scene.id} title`, gaps);
  }

  return gaps;
}

export function gapsByLocale(gaps: readonly TranslationGap[]): Record<ContentLocale, string[]> {
  const grouped: Record<ContentLocale, string[]> = { ru: [], uk: [], en: [] };
  for (const gap of gaps) grouped[gap.locale].push(gap.ref);
  for (const locale of CONTENT_LOCALES) grouped[locale].sort();
  return grouped;
}

function missing(
  text: LocalizedText | null | undefined,
  ref: string,
  gaps: TranslationGap[],
): void {
  if (!text) return;
  for (const locale of CONTENT_LOCALES) {
    if (!text[locale]?.trim()) gaps.push({ locale, ref });
  }
}
