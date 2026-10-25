import AsyncStorage from '@react-native-async-storage/async-storage';

import { createNetInfoMonitor } from '@/features/progress/network';
import { supabase } from '@/lib/supabase';

import { createVocabRepository } from './repository';
import { createSupabaseVocabRemote } from './supabaseRemote';

export const vocabRepository = createVocabRepository({
  storage: AsyncStorage,
  network: createNetInfoMonitor(),
  remote: createSupabaseVocabRemote(supabase),
});
