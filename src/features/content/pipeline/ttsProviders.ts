import type { AudioSpeed } from '@/features/audio/select';

import { spanishSsml, SLOW_SPEAKING_RATE, type TtsLocale } from './ssml';

export type TtsEncoding = 'bytes' | 'google-json';

export type TtsHttpRequest = {
  url: string;
  headers: Record<string, string>;
  body?: string;
};

export type TtsProviderId = 'azure' | 'google' | 'openai';

export const TTS_PROVIDER_IDS: readonly TtsProviderId[] = ['azure', 'google', 'openai'];

export type TtsSpeakInput = {
  apiKey: string;
  apiUrl?: string;
  region?: string;
  text: string;
  locale: TtsLocale;
  speed: AudioSpeed;
};

export type TtsAdapter = {
  id: TtsProviderId;
  encoding: TtsEncoding;
  request(input: TtsSpeakInput): TtsHttpRequest;
};

const AZURE_VOICES: Record<TtsLocale, string> = {
  'es-ES': 'es-ES-ElviraNeural',
  'es-MX': 'es-MX-DaliaNeural',
};

const GOOGLE_VOICES: Record<TtsLocale, string> = {
  'es-ES': 'es-ES-Neural2-A',
  'es-MX': 'es-MX-Neural2-A',
};

export const DEFAULT_OPENAI_URL = 'https://api.openai.com/v1/audio/speech';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini-tts';
export const DEFAULT_OPENAI_VOICE = 'coral';
export const DEFAULT_AZURE_REGION = 'westeurope';
export const DEFAULT_GOOGLE_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const azureAdapter: TtsAdapter = {
  id: 'azure',
  encoding: 'bytes',
  request(input) {
    const region = input.region?.trim() || DEFAULT_AZURE_REGION;
    const voice = AZURE_VOICES[input.locale];
    return {
      url:
        input.apiUrl?.trim() || `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      headers: {
        'Ocp-Apim-Subscription-Key': input.apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: spanishSsml(input.text, input.locale, voice, input.speed),
    };
  },
};

const googleAdapter: TtsAdapter = {
  id: 'google',
  encoding: 'google-json',
  request(input) {
    const voice = GOOGLE_VOICES[input.locale];
    // speakingRate is a multiplier: 1 is normal, below 1 is slower.
    // The SSML stays at the default rate so the two controls are not stacked.
    const speakingRate = input.speed === 'slow' ? SLOW_SPEAKING_RATE : 1;
    return {
      url: input.apiUrl?.trim() || DEFAULT_GOOGLE_URL,
      headers: {
        'x-goog-api-key': input.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { ssml: spanishSsml(input.text, input.locale, voice, 'normal') },
        voice: { languageCode: input.locale, name: voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
      }),
    };
  },
};

const openaiAdapter: TtsAdapter = {
  id: 'openai',
  encoding: 'bytes',
  request(input) {
    return {
      url: input.apiUrl?.trim() || DEFAULT_OPENAI_URL,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_OPENAI_MODEL,
        voice: DEFAULT_OPENAI_VOICE,
        input: input.text,
        speed: input.speed === 'slow' ? SLOW_SPEAKING_RATE : 1,
        response_format: 'mp3',
      }),
    };
  },
};

const ADAPTERS: Record<TtsProviderId, TtsAdapter> = {
  azure: azureAdapter,
  google: googleAdapter,
  openai: openaiAdapter,
};

export function isTtsProviderId(value: string): value is TtsProviderId {
  return (TTS_PROVIDER_IDS as readonly string[]).includes(value);
}

export function ttsAdapter(id: string): TtsAdapter {
  if (!isTtsProviderId(id)) {
    throw new Error(`Неизвестный TTS-провайдер «${id}». Доступны: ${TTS_PROVIDER_IDS.join(', ')}.`);
  }
  return ADAPTERS[id];
}
