import { formatDate, formatNumber, formatWeekday } from './format';

const FRIDAY = new Date(Date.UTC(2026, 9, 23));
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

describe('Intl formatting follows the interface language', () => {
  it('formats numbers with the selected locale', () => {
    expect(formatNumber(1000, 'en')).toBe('1,000');
    expect(formatNumber(1000, 'ru')).toBe('1\u00a0000');
    expect(formatNumber(1000, 'uk')).toBe('1\u00a0000');
    expect(formatNumber(1000, 'de')).toBe('1,000');
  });

  it('formats dates and weekdays with the selected locale', () => {
    expect(formatDate(FRIDAY, 'en', DATE_OPTIONS)).toBe('Oct 23, 2026');
    expect(formatDate(FRIDAY, 'ru', DATE_OPTIONS)).toBe('23 окт. 2026 г.');
    expect(formatDate(FRIDAY, 'uk', DATE_OPTIONS)).toBe('23 жовт. 2026 р.');
    expect(formatWeekday('2026-10-23', 'en')).toBe('Fri');
    expect(formatWeekday('2026-10-23', 'ru')).toBe('пт');
    expect(formatWeekday('2026-10-18', 'uk')).toBe('нд');
  });
});
