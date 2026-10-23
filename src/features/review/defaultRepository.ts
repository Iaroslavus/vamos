import AsyncStorage from '@react-native-async-storage/async-storage';

import { createNetInfoMonitor } from '@/features/progress/network';
import { supabase } from '@/lib/supabase';

import { createReviewRepository } from './repository';
import { createSupabaseReviewRemote } from './supabaseRemote';

export const reviewRepository = createReviewRepository({
  storage: AsyncStorage,
  network: createNetInfoMonitor(),
  remote: createSupabaseReviewRemote(supabase),
});
