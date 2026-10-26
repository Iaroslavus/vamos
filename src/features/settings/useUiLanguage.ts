import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { syncUiLanguage } from '@/features/auth/supabaseAuth';
import { useLearnerProfile, useSaveLearner } from '@/features/learner/useLearnerProfile';
import { activeUiLanguage, type UiLanguage } from '@/i18n/language';
import { claimedUiLanguage, claimUiLanguage, writeStoredUiLanguage } from '@/i18n/preference';

export function useUiLanguage() {
  const { i18n } = useTranslation();
  const save = useSaveLearner();
  const language = activeUiLanguage(i18n.language);

  const setLanguage = (next: UiLanguage) => {
    claimUiLanguage(next);
    void i18n.changeLanguage(next);
    void writeStoredUiLanguage(next);
    void syncUiLanguage(next);
    void save({ uiLanguage: next }).catch(() => {
      // The device copy is already stored. The next profile read uploads it.
    });
  };

  return { language, setLanguage };
}

/** Applies the account language once, unless this launch already chose one. */
export function useApplyProfileLanguage(): void {
  const { i18n } = useTranslation();
  const language = useLearnerProfile().data?.uiLanguage ?? null;

  useEffect(() => {
    if (!language || claimedUiLanguage()) return;
    claimUiLanguage(language);
    if (language !== activeUiLanguage(i18n.language)) {
      void i18n.changeLanguage(language);
    }
  }, [i18n, language]);
}
