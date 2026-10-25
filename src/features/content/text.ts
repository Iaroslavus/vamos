import { activeUiLanguage, type UiLanguage } from '@/i18n/language';

import type { LocalizedText } from './schema';

/** Course glosses follow the same three languages as the interface. */
export const CONTENT_LOCALES = ['ru', 'uk', 'en'] as const;
export type ContentLocale = UiLanguage;

/** An unsupported tag, including an empty one, reads the course in English. */
export function contentLocale(language: string | null | undefined): ContentLocale {
  return activeUiLanguage(language);
}

/**
 * The learner's language, then English.
 * A blank or missing English string stays missing so the content report can name it.
 */
export function pickText(
  text: LocalizedText | null | undefined,
  language: string | null | undefined,
): string | null {
  if (!text) return null;
  const locale = contentLocale(language);
  const direct = filled(text[locale]);
  if (direct) return direct;
  if (locale === 'en') return null;
  return filled(text.en);
}

/** `pickText`, or an empty string when both the learner language and English are absent. */
export function textOf(
  text: LocalizedText | null | undefined,
  language: string | null | undefined,
): string {
  return pickText(text, language) ?? '';
}

/** One wording copied into Russian, Ukrainian, and English. */
export function fillLocales(text: string): LocalizedText {
  return { ru: text, uk: text, en: text };
}

function filled(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
