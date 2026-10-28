import type { Item } from '@/features/content/schema';

import { publicAudioUrl } from './storage';

export type AudioCacheStore = {
  /** Local file URI when this object is already on disk. */
  localUri(objectPath: string): Promise<string | null>;
  download(objectPath: string, url: string): Promise<void>;
};

let store: AudioCacheStore | null = null;

export function registerAudioCache(next: AudioCacheStore | null): void {
  store = next;
}

export async function cachedAudioUri(objectPath: string): Promise<string | null> {
  if (!store) return null;
  return store.localUri(objectPath);
}

/** Storage object paths on these units. Legacy `a1/hola.mp3` names are skipped. */
export function collectTopicAudioPaths(items: readonly Item[]): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  const push = (path: string | null) => {
    if (!path?.startsWith('items/') || seen.has(path)) return;
    seen.add(path);
    paths.push(path);
  };
  for (const item of items) {
    push(item.audio.es);
    push(item.audio.latam);
    push(item.audio.slow.es);
    push(item.audio.slow.latam);
    for (const part of item.audio.parts) {
      push(part.es);
      push(part.latam);
      push(part.slow.es);
      push(part.slow.latam);
    }
  }
  return paths;
}

/** Download any topic clip that is not already in the local cache. */
export async function cacheTopicAudio(
  items: readonly Item[],
  supabaseUrl: string,
  active: AudioCacheStore | null = store,
): Promise<void> {
  const base = supabaseUrl.trim();
  if (!active || !base) return;
  for (const objectPath of collectTopicAudioPaths(items)) {
    if (await active.localUri(objectPath)) continue;
    await active.download(objectPath, publicAudioUrl(objectPath, base));
  }
}

/** Start a topic download without blocking the lesson. No-ops until a store is registered. */
export function prefetchTopicAudio(items: readonly Item[]): void {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  if (!store || !base) return;
  void cacheTopicAudio(items, base).catch(() => undefined);
}
