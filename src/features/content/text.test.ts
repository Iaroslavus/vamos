import { contentLocale, pickText, textOf } from './text';

describe('content glosses', () => {
  const hello = { ru: 'привет', uk: 'привіт', en: 'hello' };

  it('reads the learner language', () => {
    expect(pickText(hello, 'ru')).toBe('привет');
    expect(pickText(hello, 'uk')).toBe('привіт');
    expect(pickText(hello, 'en')).toBe('hello');
  });

  it('substitutes English when the learner language is missing', () => {
    expect(pickText({ ru: 'привет', en: 'hello' }, 'uk')).toBe('hello');
    expect(textOf({ en: 'hello' }, 'ru')).toBe('hello');
  });

  it('treats an unsupported language as English', () => {
    expect(contentLocale('fr')).toBe('en');
    expect(contentLocale(null)).toBe('en');
    expect(pickText(hello, 'de')).toBe('hello');
  });
});
