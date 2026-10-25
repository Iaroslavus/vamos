import i18n from '@/i18n';

import { contentLocale, type ContentLocale } from './text';

/** Interface language the loader uses for course glosses. English is the fallback. */
export function contentLanguage(): ContentLocale {
  return contentLocale(i18n.language);
}
