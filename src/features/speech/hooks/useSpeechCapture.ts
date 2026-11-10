import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import {
  accessFromPermission,
  shouldRequireOnDevice,
  speechStartOptions,
  speechVolumeLevel,
  type SpeechAccess,
} from '../options';
import type { SpeechAlternative } from '../score';

export type SpeechNotice = 'none' | 'no-speech' | 'error';

export type SpeechListenMode = 'grade' | 'dialog';

export type SpeechCaptureRequest = {
  mode: SpeechListenMode;
  hints: readonly string[];
  /** Write a cache file so the learner can hear the take. The caller deletes it. */
  record: boolean;
};

export type SpeechFinal = {
  transcript: string;
  confidence: number;
  alternatives: SpeechAlternative[];
  recordingUri: string | null;
};

type PermissionSnapshot = {
  granted: boolean;
  canAskAgain?: boolean;
  status?: string;
};

/**
 * Listens once and reports the best hypothesis plus n-best alternatives.
 * A recording file is created only when `record` is set.
 */
export function useSpeechCapture(
  request: SpeechCaptureRequest,
  onFinal: (result: SpeechFinal) => void,
) {
  const onFinalRef = useRef(onFinal);
  const requestRef = useRef(request);
  const recordingRef = useRef<string | null>(null);
  const fileRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    onFinalRef.current = onFinal;
    requestRef.current = request;
  }, [onFinal, request]);

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
        if (fileRef.current) {
          setNotice('none');
          return;
        }
        setListening(true);
        setTranscript('');
        setVolume(0);
        setNotice('none');
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        fileRef.current = false;
        setListening(false);
        setVolume(0);
      }),
      ExpoSpeechRecognitionModule.addListener('audiostart', () => {
        recordingRef.current = null;
      }),
      ExpoSpeechRecognitionModule.addListener('audioend', (event) => {
        recordingRef.current = event.uri;
      }),
      ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const best = event.results[0];
        const text = best?.transcript ?? '';
        setTranscript(text);
        if (!event.isFinal) return;
        const alternatives = event.results.slice(1).map((item) => ({
          transcript: item.transcript,
          confidence: item.confidence,
        }));
        onFinalRef.current({
          transcript: text,
          confidence: best?.confidence ?? -1,
          alternatives,
          recordingUri: recordingRef.current,
        });
      }),
      ExpoSpeechRecognitionModule.addListener('error', (event) => {
        fileRef.current = false;
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

  const prepare = useCallback(async (): Promise<boolean> => {
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
      return next === 'granted';
    } catch {
      setAccess('unavailable');
      return false;
    }
  }, []);

  const recognitionOptions = useCallback(async (record?: boolean) => {
    const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    const onDevice = shouldRequireOnDevice(
      ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
      locales.installedLocales,
    );
    const pending = requestRef.current;
    return speechStartOptions(onDevice, pending.mode, pending.hints, record ?? pending.record);
  }, []);

  const begin = useCallback(async (): Promise<boolean> => {
    const ready = await prepare();
    if (!ready) return false;
    try {
      fileRef.current = false;
      ExpoSpeechRecognitionModule.start(await recognitionOptions());
      return true;
    } catch {
      setAccess('unavailable');
      return false;
    }
  }, [prepare, recognitionOptions]);

  /** Score a finished take. The file is not a second microphone capture. */
  const beginFile = useCallback(
    async (uri: string): Promise<boolean> => {
      const ready = await prepare();
      if (!ready) return false;
      try {
        fileRef.current = true;
        ExpoSpeechRecognitionModule.start({
          ...(await recognitionOptions(false)),
          audioSource: { uri },
        });
        return true;
      } catch {
        fileRef.current = false;
        setNotice('error');
        return false;
      }
    },
    [prepare, recognitionOptions],
  );

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { access, listening, transcript, volume, notice, begin, beginFile, stop };
}
