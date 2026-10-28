import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import { BUNDLED_AUDIO_ASSETS } from './assets';
import {
  NORMAL_RATE,
  SLOW_RATE,
  SPEECH_LANGUAGE,
  SPEECH_PITCH,
  applyPlayerRate,
  playLessonAudio,
  resolveAudioSource,
  stopLessonAudio,
} from './playback';
import { registerAudioCache, type AudioCacheStore } from './cache';
import { speechEngineRate } from './speechRate';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
}));

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockRemove = jest.fn();
const mockSetPlaybackRate = jest.fn();
const mockPlayer = {
  play: mockPlay,
  pause: mockPause,
  remove: mockRemove,
  setPlaybackRate: mockSetPlaybackRate,
  shouldCorrectPitch: false,
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

describe('resolveAudioSource', () => {
  it('returns null for content paths without bundled assets', () => {
    expect(resolveAudioSource('a1/hola.mp3')).toBeNull();
  });

  it('uses device TTS for a storage path until the project URL is set', () => {
    const previous = process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(resolveAudioSource('items/a1/cafe/un_cafe.es.mp3')).toBeNull();
    process.env.EXPO_PUBLIC_SUPABASE_URL = previous;
  });

  it('resolves a stored clip to the public audio bucket', () => {
    const previous = process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321/';
    expect(resolveAudioSource('items/a1/cafe/un_cafe.es.mp3')).toBe(
      'http://127.0.0.1:54321/storage/v1/object/public/audio/items/a1/cafe/un_cafe.es.mp3',
    );
    process.env.EXPO_PUBLIC_SUPABASE_URL = previous;
  });

  it('returns remote URIs as-is', () => {
    expect(resolveAudioSource('https://cdn.example/a1/hola.mp3')).toBe(
      'https://cdn.example/a1/hola.mp3',
    );
  });

  it('returns bundled assets when registered', () => {
    BUNDLED_AUDIO_ASSETS['a1/test.mp3'] = 42;
    expect(resolveAudioSource('a1/test.mp3')).toBe(42);
    delete BUNDLED_AUDIO_ASSETS['a1/test.mp3'];
  });
});

describe('rates', () => {
  it('keeps the slow listen button at 0.7×', () => {
    expect(SLOW_RATE).toBe(0.7);
    expect(NORMAL_RATE).toBe(1);
  });
});

describe('applyPlayerRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayer.shouldCorrectPitch = false;
  });

  it('enables pitch correction and forwards rate to setPlaybackRate', () => {
    applyPlayerRate(mockPlayer as never, SLOW_RATE);

    expect(mockPlayer.shouldCorrectPitch).toBe(true);
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(SLOW_RATE, 'high');
  });
});

describe('playLessonAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayer.shouldCorrectPitch = false;
  });

  it('falls back to expo-speech (es-ES) when no file is available', async () => {
    const source = await playLessonAudio({
      audio: 'a1/missing.mp3',
      text: 'Hola',
      rate: NORMAL_RATE,
    });

    expect(source).toBe('speech');
    expect(Speech.speak).toHaveBeenCalledWith(
      'Hola',
      expect.objectContaining({
        language: SPEECH_LANGUAGE,
        rate: NORMAL_RATE,
        pitch: SPEECH_PITCH,
      }),
    );
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('maps slow playback 0.7 through the iOS speech curve and keeps pitch 1', async () => {
    await playLessonAudio({ text: 'Gracias', rate: SLOW_RATE });

    const engineRate = speechEngineRate(SLOW_RATE, 'ios');
    expect(engineRate).toBeLessThan(SLOW_RATE);
    expect(Speech.speak).toHaveBeenCalledWith(
      'Gracias',
      expect.objectContaining({
        language: SPEECH_LANGUAGE,
        rate: engineRate,
        pitch: SPEECH_PITCH,
      }),
    );
  });

  it('logs speech duration from onStart to onDone', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const now = jest.spyOn(Date, 'now');
    await playLessonAudio({ text: 'Hola', rate: SLOW_RATE });

    const options = (Speech.speak as jest.Mock).mock.calls.at(-1)?.[1] as {
      onStart: () => void;
      onDone: () => void;
    };
    now.mockReturnValueOnce(1_000);
    options.onStart();
    now.mockReturnValueOnce(2_400);
    options.onDone();

    expect(log).toHaveBeenCalledWith(expect.stringContaining('source=speech'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('playbackRate=0.7'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('durationMs=1400'));
    log.mockRestore();
    now.mockRestore();
  });

  it('plays a slow file at playbackRate 1 and slows only speech when the file is missing', async () => {
    const previous = process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321/';
    registerAudioCache(null);

    const file = await playLessonAudio({
      audio: 'items/a1/hola/hola.es.slow.m4a',
      text: 'Hola',
      rate: SLOW_RATE,
    });

    expect(file).toBe('file');
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(1, 'high');
    expect(mockSetPlaybackRate).not.toHaveBeenCalledWith(SLOW_RATE, expect.anything());
    expect(Speech.speak).not.toHaveBeenCalled();

    jest.clearAllMocks();
    const spoken = await playLessonAudio({ text: 'Hola', rate: SLOW_RATE });

    expect(spoken).toBe('speech');
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith(
      'Hola',
      expect.objectContaining({
        language: SPEECH_LANGUAGE,
        rate: speechEngineRate(SLOW_RATE),
        pitch: SPEECH_PITCH,
      }),
    );
    process.env.EXPO_PUBLIC_SUPABASE_URL = previous;
  });

  it('plays a file at 1× even when the button asked for slow', async () => {
    const source = await playLessonAudio({
      audio: 'https://cdn.example/clip.mp3',
      text: 'Hola',
      rate: SLOW_RATE,
    });

    expect(source).toBe('file');
    expect(setAudioModeAsync).toHaveBeenCalled();
    expect(createAudioPlayer).toHaveBeenCalledWith('https://cdn.example/clip.mp3');
    expect(mockPlay).toHaveBeenCalled();
    expect(mockPlayer.shouldCorrectPitch).toBe(true);
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(NORMAL_RATE, 'high');
    expect(Speech.speak).not.toHaveBeenCalled();

    // Rate must be applied after play so iOS updates live AVPlayer.rate.
    expect(mockPlay.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetPlaybackRate.mock.invocationCallOrder[0]!,
    );
  });

  it('stops previous playback before starting again (no stacking)', async () => {
    await playLessonAudio({
      audio: 'https://cdn.example/clip.mp3',
      text: 'Hola',
      rate: NORMAL_RATE,
    });
    await playLessonAudio({
      audio: 'https://cdn.example/clip.mp3',
      text: 'Hola',
      rate: SLOW_RATE,
    });

    expect(Speech.stop).toHaveBeenCalled();
    expect(mockPause).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
    expect(mockSetPlaybackRate).toHaveBeenLastCalledWith(NORMAL_RATE, 'high');
  });

  it('speaks when the file cannot be opened', async () => {
    jest.mocked(createAudioPlayer).mockImplementationOnce(() => {
      throw new Error('decode');
    });

    const source = await playLessonAudio({
      audio: 'https://cdn.example/missing.mp3',
      text: 'Hola',
      rate: SLOW_RATE,
    });

    expect(source).toBe('speech');
    expect(Speech.speak).toHaveBeenCalledWith(
      'Hola',
      expect.objectContaining({ language: SPEECH_LANGUAGE, rate: speechEngineRate(SLOW_RATE) }),
    );
  });

  it('plays a cached topic clip without asking the network', async () => {
    const memory: AudioCacheStore = {
      localUri: async () => 'file:///cache/hola.m4a',
      download: async () => undefined,
    };
    registerAudioCache(memory);

    const source = await playLessonAudio({
      audio: 'items/a1/hola/hola.es.slow.m4a',
      text: 'Hola',
      rate: SLOW_RATE,
    });

    expect(source).toBe('file');
    expect(createAudioPlayer).toHaveBeenCalledWith('file:///cache/hola.m4a');
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(NORMAL_RATE, 'high');
    expect(Speech.speak).not.toHaveBeenCalled();
    registerAudioCache(null);
  });

  it('stops speech and file playback', async () => {
    await playLessonAudio({
      audio: 'https://cdn.example/clip.mp3',
      text: 'Hola',
    });
    await stopLessonAudio();

    expect(Speech.stop).toHaveBeenCalled();
    expect(mockPause).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('calls onEnd when speech finishes and skips a replaced playback', async () => {
    const onEnd = jest.fn();
    await playLessonAudio({ text: 'Hola', onEnd });
    const first = (Speech.speak as jest.Mock).mock.calls.at(-1)?.[1] as { onDone: () => void };

    await playLessonAudio({ text: 'Adiós' });
    first.onDone();
    expect(onEnd).not.toHaveBeenCalled();

    const second = (Speech.speak as jest.Mock).mock.calls.at(-1)?.[1] as { onDone: () => void };
    second.onDone();
    expect(onEnd).not.toHaveBeenCalled();

    const heard = jest.fn();
    await playLessonAudio({ text: 'Gracias', onEnd: heard });
    const third = (Speech.speak as jest.Mock).mock.calls.at(-1)?.[1] as { onDone: () => void };
    third.onDone();
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
