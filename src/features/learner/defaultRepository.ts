import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { languageFromDevice } from '@/i18n/language';
import { readStoredUiLanguage, writeStoredUiLanguage } from '@/i18n/preference';
import { supabase } from '@/lib/supabase';

import {
  createLearnerRepository,
  profileFromRemote,
  profileToRemote,
  type LearnerRemote,
} from './repository';

function supabaseLearnerRemote(): LearnerRemote {
  return {
    async fetch(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, goal, daily_minutes, ui_language, spanish_variant')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return profileFromRemote(data);
    },

    async update(userId, profile) {
      const { error } = await supabase
        .from('profiles')
        .update(profileToRemote(profile))
        .eq('id', userId);
      if (error) throw error;
    },
  };
}

export const learnerRepository = createLearnerRepository({
  storage: AsyncStorage,
  remote: supabaseLearnerRemote(),
  deviceLanguage: () => languageFromDevice(getLocales()),
  languageStorage: {
    read: readStoredUiLanguage,
    write: writeStoredUiLanguage,
  },
});
