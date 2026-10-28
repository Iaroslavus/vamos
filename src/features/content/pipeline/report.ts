import { audioGaps } from '@/features/audio/select';

import type { Item, Lesson } from '../schema';
import { contentIssues, type ContentBundle } from '../integrity';
import { gapsByLocale, translationGaps } from '../translations';
import { CONTENT_LOCALES, type ContentLocale } from '../text';

export type LessonStat = {
  id: string;
  units: number;
  phrases: number;
  words: number;
  draft: boolean;
};

export type ContentReport = {
  topics: number;
  draftTopics: number;
  lessons: LessonStat[];
  items: number;
  phrases: number;
  phraseShare: number;
  draftItems: number;
  draftLessons: number;
  missingAudio: string[];
  /** Refs with no wording in that language. Does not fail the link check. */
  missingTranslations: Record<ContentLocale, string[]>;
  issues: string[];
  ok: boolean;
};

/** Every required voice, speed, and part has a storage clip. Otherwise the device speaks. */
export function hasPlayableAudio(item: Item): boolean {
  return audioGaps(item).length === 0;
}

export function buildReport(
  bundle: ContentBundle,
  extraIssues: readonly string[] = [],
): ContentReport {
  const byId = new Map(bundle.items.map((item) => [item.id, item]));
  const lessons = bundle.lessons.map((lesson) => lessonStat(lesson, byId));
  const phrases = bundle.items.filter((item) => item.type === 'phrase').length;
  const issues = [...extraIssues, ...contentIssues(bundle)];
  return {
    topics: bundle.topics.length,
    draftTopics: bundle.topics.filter((topic) => topic.draft).length,
    lessons,
    items: bundle.items.length,
    phrases,
    phraseShare: bundle.items.length === 0 ? 0 : phrases / bundle.items.length,
    draftItems: bundle.items.filter((item) => item.draft).length,
    draftLessons: bundle.lessons.filter((lesson) => lesson.draft).length,
    missingAudio: bundle.items
      .map((item) => ({ id: item.id, missing: audioGaps(item).length }))
      .filter((row) => row.missing > 0)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((row) => `${row.id} — нет ${row.missing}`),
    missingTranslations: gapsByLocale(translationGaps(bundle)),
    issues,
    ok: issues.length === 0,
  };
}

export function formatReport(report: ContentReport): string {
  const share = Math.round(report.phraseShare * 100);
  const lines = [
    `Темы: ${report.topics} (черновики: ${report.draftTopics})`,
    `Уроки: ${report.lessons.length} (черновики: ${report.draftLessons})`,
    `Единицы: ${report.items}, фразы: ${report.phrases} (${share}%)`,
    `Черновики единиц: ${report.draftItems}`,
    '',
    'Единиц на урок:',
    ...report.lessons.map((lesson) => {
      const state = lesson.draft ? ', черновик' : '';
      return `  ${lesson.id} — ${lesson.units} (фразы ${lesson.phrases}, слова ${lesson.words})${state}`;
    }),
    '',
    `Без аудио, озвучивает устройство: ${report.missingAudio.length}`,
    ...report.missingAudio.map((id) => `  ${id}`),
    '',
    'Не хватает переводов:',
    ...CONTENT_LOCALES.flatMap((locale) => {
      const refs = report.missingTranslations[locale];
      return [`  ${locale}: ${refs.length}`, ...refs.map((ref) => `    ${ref}`)];
    }),
    '',
    report.ok ? 'Ссылки: ок' : 'Ссылки: сломаны',
    ...report.issues.map((issue) => `  ${issue}`),
  ];
  return lines.join('\n');
}

function lessonStat(lesson: Lesson, byId: ReadonlyMap<string, Item>): LessonStat {
  let phrases = 0;
  let words = 0;
  for (const id of lesson.items) {
    const item = byId.get(id);
    if (!item) continue;
    if (item.type === 'phrase') phrases += 1;
    else words += 1;
  }
  return {
    id: lesson.id,
    units: lesson.items.length,
    phrases,
    words,
    draft: lesson.draft,
  };
}
