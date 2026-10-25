import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import {
  accessFromPermission,
  shouldRequireOnDevice,
  speechStartOptions,
  speechVolumeLevel,
  type SpeechAccess,
} from '../options';

export type SpeechNotice = 'none' | 'no-speech' | 'error';

type PermissionSnapshot = {
  granted: boolean;
  canAskAgain?: boolean;
  status?: string;
};

/**
 * Listens once and reports transcripts.
 * Never enables `recordingOptions`, so the user's audio is not stored.
 */
export function useSpeechCapture(hints: readonly string[], onFinal: (transcript: string) => void) {
  const onFinalRef = useRef(onFinal);
  const hintsRef = useRef(hints);
  const mounted = useRef(true);

  useEffect(() => {
    onFinalRef.current = onFinal;
    hintsRef.current = hints;
  }, [hints, onFinal]);

  const [access, setAccess] = useState<SpeechAccess>('unknown');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [notice, setNotice] = useState<SpeechNotice>('none');

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
          if (mounted.current) setAccess('unavailable');
          return;
        }
        const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        if (mounted.current) setAccess(accessFromPermission(permission));
      } catch {
        if (mounted.current) setAccess('unavailable');
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const subscriptions = [
      ExpoSpeechRecognitionModule.addListener('start', () => {
        setListening(true);
        setTranscript('');
        setVolume(0);
        setNotice('none');
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        setListening(false);
        setVolume(0);
      }),
      ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const text = event.results[0]?.transcript ?? '';
        setTranscript(text);
        if (event.isFinal) onFinalRef.current(text);
      }),
      ExpoSpeechRecognitionModule.addListener('error', (event) => {
        setListening(false);
        setVolume(0);
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed') {
          setAccess('denied');
          return;
        }
        if (event.error === 'language-not-supported' || event.error === 'service-not-allowed') {
          setAccess('unavailable');
          return;
        }
        if (event.error === 'no-speech' || event.error === 'speech-timeout') {
          setNotice('no-speech');
          return;
        }
        setNotice('error');
      }),
      ExpoSpeechRecognitionModule.addListener('volumechange', (event) => {
        setVolume(speechVolumeLevel(event.value));
      }),
    ];

    return () => {
      for (const subscription of subscriptions) subscription.remove();
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  const begin = useCallback(async (): Promise<boolean> => {
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setAccess('unavailable');
        return false;
      }
      const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      let permission: PermissionSnapshot = current;
      if (!current.granted) {
        if (current.status === 'denied' && current.canAskAgain === false) {
          setAccess('blocked');
          return false;
        }
        permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      }
      const next = accessFromPermission(permission);
      setAccess(next);
      if (next !== 'granted') return false;

      const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({});
      const onDevice = shouldRequireOnDevice(
        ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
        locales.installedLocales,
      );
      ExpoSpeechRecognitionModule.start(speechStartOptions(onDevice, hintsRef.current));
      return true;
    } catch {
      setAccess('unavailable');
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { access, listening, transcript, volume, notice, begin, stop };
}
