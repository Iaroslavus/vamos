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

describe('locale catalogs', () => {
  it('gives ru, uk, and en the same keys', () => {
    const russian = leafKeys(ru).sort();
    expect(leafKeys(uk).sort()).toEqual(russian);
    expect(leafKeys(en).sort()).toEqual(russian);
  });

  it('marks uk and en as untranslated copies of Russian', () => {
    expect(uk._todo).toBe('TODO: translations in L2');
    expect(en._todo).toBe('TODO: translations in L2');
    for (const path of leafKeys(ru)) {
      if (path === '_todo') continue;
      expect(leafValue(uk, path)).toBe(leafValue(ru, path));
      expect(leafValue(en, path)).toBe(leafValue(ru, path));
    }
  });
});

describe('plurals', () => {
  it('uses three Slavic forms for one, two, and five phrases', () => {
    for (const lng of ['ru', 'uk'] as const) {
      expect(i18n.t('topics.phraseCount', { lng, count: 1 })).toBe('1 фраза');
      expect(i18n.t('topics.phraseCount', { lng, count: 2 })).toBe('2 фразы');
      expect(i18n.t('topics.phraseCount', { lng, count: 5 })).toBe('5 фраз');
    }
  });

  it('uses English one/other forms', () => {
    expect(i18n.t('topics.phraseCount', { lng: 'en', count: 1 })).toBe('1 фраза');
    expect(i18n.t('topics.phraseCount', { lng: 'en', count: 2 })).toBe('2 фраз');
    expect(i18n.t('topics.phraseCount', { lng: 'en', count: 5 })).toBe('5 фраз');
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
