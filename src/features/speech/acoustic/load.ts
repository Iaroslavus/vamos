import { File } from 'expo-file-system';

import { cachedAudioUri } from '@/features/audio/cache';
import { publicAudioUrl } from '@/features/audio/storage';

import { tryParseUnitFeatures, type UnitFeatures } from './reference';

/** Load the compact reference for this unit. A missing file leaves acoustics off. */
export async function loadUnitFeatures(
  path: string | null | undefined,
): Promise<UnitFeatures | null> {
  if (!path || !path.startsWith('items/') || !path.endsWith('.json')) return null;
  try {
    const cached = await cachedAudioUri(path);
    const text = cached ? await readText(cached) : await fetchText(path);
    if (!text) return null;
    return tryParseUnitFeatures(text);
  } catch {
    return null;
  }
}

async function readText(uri: string): Promise<string | null> {
  const file = new File(uri);
  if (!file.exists) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  return new TextDecoder().decode(bytes);
}

async function fetchText(path: string): Promise<string | null> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  if (!base) return null;
  const response = await fetch(publicAudioUrl(path, base));
  if (!response.ok) return null;
  return response.text();
}
