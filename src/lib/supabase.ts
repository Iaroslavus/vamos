import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { env } from '@/lib/env';

export function createSupabaseClient(): SupabaseClient {
  return createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      // On web supabase-js falls back to localStorage; AsyncStorage is only needed on native.
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      // There is no URL to read the session from on native; web handles OAuth redirects itself.
      detectSessionInUrl: Platform.OS === 'web',
      // React Native has no Web Locks API — use an in-process lock so concurrent refreshes don't race.
      lock: processLock,
    },
  });
}

/**
 * Token auto-refresh runs on a timer, which React Native pauses in the background. Keep it alive
 * only while the app is in the foreground and resume it (with an immediate refresh) on return.
 */
export function handleAppStateChange(client: SupabaseClient, state: AppStateStatus): void {
  if (state === 'active') {
    void client.auth.startAutoRefresh();
  } else {
    void client.auth.stopAutoRefresh();
  }
}

export function registerAppStateAutoRefresh(client: SupabaseClient) {
  return AppState.addEventListener('change', (state) => handleAppStateChange(client, state));
}

export const supabase = createSupabaseClient();

registerAppStateAutoRefresh(supabase);
