import { useEffect, useState } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * True when speech recognition exists and the microphone permission is granted.
 * A denied permission that cannot be asked again stays closed. Anything else is requested once.
 */
export async function learnMicrophoneAvailable(): Promise<boolean> {
  try {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return false;
    const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (current.granted) return true;
    if (current.status === 'denied' && current.canAskAgain === false) return false;
    const asked = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return asked.granted === true;
  } catch {
    return false;
  }
}

/** `null` until the check finishes. */
export function useLearnMic(): boolean | null {
  const [mic, setMic] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    void learnMicrophoneAvailable().then((value) => {
      if (live) setMic(value);
    });
    return () => {
      live = false;
    };
  }, []);

  return mic;
}
