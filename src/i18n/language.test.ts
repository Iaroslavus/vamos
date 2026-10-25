import {
  languageFromDevice,
  languageFromTag,
  resolveUiLanguage,
  UI_LANGUAGE_FALLBACK,
} from './language';

describe('languageFromDevice', () => {
  it('uses the device language when the app supports it', () => {
    expect(languageFromDevice([{ languageCode: 'uk' }])).toBe('uk');
    expect(languageFromDevice([{ languageTag: 'ru-RU' }])).toBe('ru');
    expect(languageFromDevice([{ languageCode: 'en', languageTag: 'en-US' }])).toBe('en');
    expect(languageFromTag('UK')).toBe('uk');
  });

  it('falls back to English for an unsupported or missing language', () => {
    expect(languageFromDevice([{ languageCode: 'de' }])).toBe('en');
    expect(languageFromDevice([{ languageTag: 'fr-FR' }])).toBe('en');
    expect(languageFromDevice([])).toBe('en');
    expect(languageFromTag(null)).toBe('en');
    expect(languageFromTag('')).toBe('en');
  });
});

describe('resolveUiLanguage', () => {
  it('prefers the language already stored on this device', () => {
    expect(
      resolveUiLanguage({ profile: 'en', stored: 'uk', device: 'ru', remoteKnown: true }),
    ).toEqual({ language: 'uk', persistStored: false });
  });

  it('takes the account language and remembers it on the device', () => {
    expect(
      resolveUiLanguage({ profile: 'uk', stored: null, device: 'ru', remoteKnown: true }),
    ).toEqual({ language: 'uk', persistStored: true });
  });

  it('stores the device language once the server is known to have none', () => {
    expect(
      resolveUiLanguage({ profile: null, stored: null, device: 'ru', remoteKnown: true }),
    ).toEqual({ language: 'ru', persistStored: true });
  });

  it('does not invent a language while the server cannot be read', () => {
    expect(
      resolveUiLanguage({ profile: null, stored: null, device: 'ru', remoteKnown: false }),
    ).toEqual({ language: null, persistStored: false });
  });
});

describe('fallback chain', () => {
  it('sends Russian and Ukrainian through English', () => {
    expect(UI_LANGUAGE_FALLBACK.ru).toEqual(['en']);
    expect(UI_LANGUAGE_FALLBACK.uk).toEqual(['en']);
    expect(UI_LANGUAGE_FALLBACK.default).toEqual(['en']);
  });
});
