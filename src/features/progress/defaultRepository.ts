import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

import { createNetInfoMonitor } from './network';
import { createProgressRepository } from './repository';
import { createSupabaseProgressRemote } from './supabaseRemote';

export const progressRepository = createProgressRepository({
  storage: AsyncStorage,
  network: createNetInfoMonitor(),
  remote: createSupabaseProgressRemote(supabase),
});
