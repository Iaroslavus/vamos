import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { languageFromDevice, UI_LANGUAGE_FALLBACK, UI_LANGUAGES } from './language';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    ru: { translation: ru },
    uk: { translation: uk },
    en: { translation: en },
  },
  lng: languageFromDevice(getLocales()),
  supportedLngs: [...UI_LANGUAGES],
  fallbackLng: UI_LANGUAGE_FALLBACK,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
