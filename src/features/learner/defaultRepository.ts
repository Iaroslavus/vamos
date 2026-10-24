import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

import { createLearnerRepository, profileFromRemote, type LearnerRemote } from './repository';

function supabaseLearnerRemote(): LearnerRemote {
  return {
    async fetch(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, goal, daily_minutes')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return profileFromRemote(data);
    },

    async update(userId, profile) {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.name,
          goal: profile.goal,
          daily_minutes: profile.dailyMinutes,
        })
        .eq('id', userId);
      if (error) throw error;
    },
  };
}

export const learnerRepository = createLearnerRepository({
  storage: AsyncStorage,
  remote: supabaseLearnerRemote(),
});
