import { createInstance } from 'i18next';

import i18n from './index';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

function leafKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leafValue(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{[^}]+\}\}/g)].map((match) => match[0]).sort();
}

describe('locale catalogs', () => {
  it('gives ru, uk, and en the same keys', () => {
    const russian = leafKeys(ru).sort();
    expect(leafKeys(uk).sort()).toEqual(russian);
    expect(leafKeys(en).sort()).toEqual(russian);
  });

  it('keeps the same placeholders in every language', () => {
    for (const path of leafKeys(ru)) {
      const russian = leafValue(ru, path);
      const english = leafValue(en, path);
      const ukrainian = leafValue(uk, path);
      expect(typeof english).toBe('string');
      expect(typeof ukrainian).toBe('string');
      if (
        typeof russian !== 'string' ||
        typeof english !== 'string' ||
        typeof ukrainian !== 'string'
      ) {
        continue;
      }
      expect(placeholders(english)).toEqual(placeholders(russian));
      expect(placeholders(ukrainian)).toEqual(placeholders(russian));
    }
  });

  it('uses the glossary names for the main sections', () => {
    expect(en.tabs.today).toBe('Today');
    expect(uk.tabs.today).toBe('Сьогодні');
    expect(en.tabs.topics).toBe('Topics');
    expect(uk.tabs.topics).toBe('Теми');
    expect(en.tabs.vocab).toBe('Phrasebook');
    expect(uk.tabs.vocab).toBe('Словник');
    expect(en.vocab.title).toBe('Phrasebook');
    expect(uk.vocab.title).toBe('Словник');
    expect(en.learn.streakCaption).toBe('streak');
    expect(uk.learn.streakCaption).toBe('серія');
    expect(en.review.title).toBe('Review');
    expect(uk.review.title).toBe('Повторення');
    expect(en.lesson.reviewTitle).toBe('Review');
    expect(uk.lesson.reviewTitle).toBe('Повторення');
  });

  it('writes English without Cyrillic and Ukrainian in Ukrainian', () => {
    expect(JSON.stringify(en)).not.toMatch(/[А-Яа-яЁёІіЇїЄєҐґ]/);
    expect(JSON.stringify(uk)).toMatch(/[іїєґІЇЄҐ]/);
    const copied = leafKeys(ru).filter((path) => leafValue(uk, path) === leafValue(ru, path));
    expect(copied.length).toBeLessThan(leafKeys(ru).length / 2);
  });
});

describe('plurals', () => {
  it('uses Russian forms for one, two, and five phrases', () => {
    expect(i18n.t('topics.phraseCount', { lng: 'ru', count: 1 })).toBe('1 фраза');
    expect(i18n.t('topics.phraseCount', { lng: 'ru', count: 2 })).toBe('2 фразы');
    expect(i18n.t('topics.phraseCount', { lng: 'ru', count: 5 })).toBe('5 фраз');
  });

  it('uses Ukrainian forms for one, two, and five phrases', () => {
    expect(i18n.t('topics.phraseCount', { lng: 'uk', count: 1 })).toBe('1 фраза');
    expect(i18n.t('topics.phraseCount', { lng: 'uk', count: 2 })).toBe('2 фрази');
    expect(i18n.t('topics.phraseCount', { lng: 'uk', count: 5 })).toBe('5 фраз');
    expect(i18n.t('today.review', { lng: 'uk', count: 2 })).toBe('Повторити 2 фрази');
    expect(i18n.t('topics.lessonCount', { lng: 'uk', count: 2 })).toBe('2 уроки');
    expect(i18n.t('topics.lessonCount', { lng: 'uk', count: 4 })).toBe('4 уроки');
    expect(i18n.t('topics.lessonCount', { lng: 'uk', count: 5 })).toBe('5 уроків');
    expect(i18n.t('topics.lessonCount', { lng: 'uk', count: 11 })).toBe('11 уроків');
    expect(i18n.t('topics.lessonCount', { lng: 'uk', count: 21 })).toBe('21 урок');
    expect(i18n.t('topics.lessonCount', { lng: 'ru', count: 2 })).toBe('2 урока');
    expect(i18n.t('topics.lessonCount', { lng: 'ru', count: 5 })).toBe('5 уроков');
  });

  it('uses English one/other forms', () => {
    expect(i18n.t('topics.phraseCount', { lng: 'en', count: 1 })).toBe('1 phrase');
    expect(i18n.t('topics.phraseCount', { lng: 'en', count: 2 })).toBe('2 phrases');
    expect(i18n.t('topics.phraseCount', { lng: 'en', count: 5 })).toBe('5 phrases');
    expect(i18n.t('today.review', { lng: 'en', count: 1 })).toBe('Review 1 phrase');
  });
});

describe('fallback chain', () => {
  it('resolves a missing Russian or Ukrainian key from English', async () => {
    const probe = createInstance();
    await probe.init({
      lng: 'ru',
      fallbackLng: { ru: ['en'], uk: ['en'], default: ['en'] },
      resources: {
        ru: { translation: { present: 'ru' } },
        uk: { translation: { present: 'uk' } },
        en: { translation: { present: 'en', onlyEn: 'from-en' } },
      },
    });

    expect(probe.t('onlyEn')).toBe('from-en');
    expect(probe.t('onlyEn', { lng: 'uk' })).toBe('from-en');
    await probe.changeLanguage('de');
    expect(probe.t('onlyEn')).toBe('from-en');
  });
});

describe('Intl interpolation', () => {
  it('formats numbers and dates for the active language', () => {
    const format = i18n.services.formatter.format.bind(i18n.services.formatter);
    expect(format(1000, 'number', 'en')).toBe('1,000');
    expect(format(1000, 'number', 'ru')).toBe('1\u00a0000');
    expect(format(1000, 'number', 'uk')).toBe('1\u00a0000');
    expect(
      format(new Date(Date.UTC(2026, 9, 23)), 'datetime', 'uk', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }),
    ).toBe('23 жовт. 2026 р.');
    expect(
      format(new Date(Date.UTC(2026, 9, 23)), 'datetime', 'en', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }),
    ).toBe('Oct 23, 2026');
  });
});
