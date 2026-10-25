export const UI_LANGUAGES = ['ru', 'uk', 'en'] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

/** Endonyms. They stay in their own language no matter which UI language is active. */
export const UI_LANGUAGE_LABELS: Record<UiLanguage, string> = {
  ru: 'Русский',
  uk: 'Українська',
  en: 'English',
};

/**
 * Missing keys in Russian or Ukrainian fall through to English.
 * An unsupported language uses the same English catalog via `default`.
 */
export const UI_LANGUAGE_FALLBACK = {
  ru: ['en'],
  uk: ['en'],
  default: ['en'],
} as const;

export type DeviceLocale = {
  languageCode?: string | null;
  languageTag?: string | null;
};

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === 'string' && (UI_LANGUAGES as readonly string[]).includes(value);
}

/** Primary language subtag. Unsupported tags, including an empty one, become English. */
export function languageFromTag(tag: string | null | undefined): UiLanguage {
  const code = tag?.trim().toLowerCase().split(/[-_]/)[0];
  return isUiLanguage(code) ? code : 'en';
}

/** First locale reported by the device. An empty list or an unsupported language is English. */
export function languageFromDevice(locales: readonly DeviceLocale[]): UiLanguage {
  const first = locales[0];
  if (!first) return 'en';
  return languageFromTag(first.languageCode ?? first.languageTag);
}

export function activeUiLanguage(language: string | null | undefined): UiLanguage {
  return languageFromTag(language);
}

/**
 * The device key wins once this phone has one.
 * Otherwise the account profile wins, and a known server with neither stores the device language.
 * Offline, with nothing stored, the caller keeps the language already on screen.
 */
export function resolveUiLanguage(input: {
  profile: UiLanguage | null;
  stored: UiLanguage | null;
  device: UiLanguage | null;
  remoteKnown: boolean;
}): { language: UiLanguage | null; persistStored: boolean } {
  if (input.stored) return { language: input.stored, persistStored: false };
  if (input.profile) return { language: input.profile, persistStored: true };
  if (input.remoteKnown && input.device) {
    return { language: input.device, persistStored: true };
  }
  return { language: null, persistStored: false };
}
