import { File } from 'expo-file-system';

/** Remove a recognizer cache file. A missing file is ignored. */
export function deleteSpeechFile(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The cache file may already be gone, or the native module is unavailable in tests.
  }
}
