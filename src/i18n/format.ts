import { activeUiLanguage, type UiLanguage } from './language';

const INTL_LOCALE: Record<UiLanguage, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  en: 'en-US',
};

export function intlLocale(language: string | null | undefined): string {
  return INTL_LOCALE[activeUiLanguage(language)];
}

export function formatNumber(value: number, language: string | null | undefined): string {
  return new Intl.NumberFormat(intlLocale(language)).format(value);
}

export function formatDate(
  value: Date,
  language: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(intlLocale(language), options).format(value);
}

/** Short weekday for a `YYYY-MM-DD` calendar day, in the selected interface language. */
export function formatWeekday(isoDate: string, language: string | null | undefined): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return formatDate(date, language, { weekday: 'short', timeZone: 'UTC' });
}
