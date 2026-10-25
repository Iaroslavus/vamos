import AsyncStorage from '@react-native-async-storage/async-storage';

import { isUiLanguage, type UiLanguage } from './language';

/** Device-level choice, read before auth so the first paint matches the last selection. */
export const UI_LANGUAGE_STORAGE_KEY = 'vamos.ui_language';

let claimed: UiLanguage | null = null;

/** A choice made on this launch. Profile sync must not paint over it. */
export function claimUiLanguage(language: UiLanguage): void {
  claimed = language;
}

export function claimedUiLanguage(): UiLanguage | null {
  return claimed;
}

export function resetClaimedUiLanguage(): void {
  claimed = null;
}

export async function readStoredUiLanguage(): Promise<UiLanguage | null> {
  const raw = await AsyncStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  return isUiLanguage(raw) ? raw : null;
}

export async function writeStoredUiLanguage(language: UiLanguage): Promise<void> {
  await AsyncStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
}

export async function hydrateUiLanguage(
  changeLanguage: (language: UiLanguage) => Promise<unknown>,
): Promise<void> {
  const stored = await readStoredUiLanguage();
  if (!stored) return;
  claimUiLanguage(stored);
  await changeLanguage(stored);
}
