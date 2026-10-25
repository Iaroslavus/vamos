import { createInstance } from 'i18next';

import en from './locales/en.json';
import uk from './locales/uk.json';
import { installSlavicPluralRules, selectSlavicCardinal } from './plurals';

describe('slavic plurals', () => {
  it('follows the forms the catalogs use', () => {
    expect(selectSlavicCardinal(0)).toBe('many');
    expect(selectSlavicCardinal(1)).toBe('one');
    expect(selectSlavicCardinal(2)).toBe('few');
    expect(selectSlavicCardinal(4)).toBe('few');
    expect(selectSlavicCardinal(5)).toBe('many');
    expect(selectSlavicCardinal(11)).toBe('many');
    expect(selectSlavicCardinal(21)).toBe('one');
    expect(selectSlavicCardinal(22)).toBe('few');
    expect(selectSlavicCardinal(1.5)).toBe('other');
  });

  it('keeps few and many when Intl only knows one and other', async () => {
    const installed = Intl.PluralRules;

    class OneOther {
      select(count: number) {
        return count === 1 ? 'one' : 'other';
      }
      resolvedOptions() {
        return { locale: 'uk', pluralCategories: ['one', 'other'], type: 'cardinal' as const };
      }
      static supportedLocalesOf() {
        return [] as string[];
      }
    }

    Intl.PluralRules = OneOther as unknown as typeof Intl.PluralRules;
    installSlavicPluralRules();

    const probe = createInstance();
    await probe.init({
      lng: 'uk',
      compatibilityJSON: 'v4',
      resources: { uk: { translation: uk } },
    });

    expect(probe.t('topics.lessonCount', { count: 2 })).toBe('2 уроки');
    expect(probe.t('topics.lessonCount', { count: 5 })).toBe('5 уроків');
    Intl.PluralRules = installed;
  });

  it('installs rules when Intl.PluralRules is missing, as on Hermes', async () => {
    const installed = Intl.PluralRules;
    Object.assign(Intl, { PluralRules: undefined });
    installSlavicPluralRules();

    const probe = createInstance();
    await probe.init({
      lng: 'uk',
      compatibilityJSON: 'v4',
      resources: { uk: { translation: uk }, en: { translation: en } },
    });

    expect(probe.t('topics.lessonCount', { count: 2 })).toBe('2 уроки');
    expect(probe.t('topics.lessonCount', { count: 1 })).toBe('1 урок');
    expect(probe.t('topics.phraseCount', { lng: 'en', count: 2 })).toBe('2 phrases');
    Object.assign(Intl, { PluralRules: installed });
  });
});
