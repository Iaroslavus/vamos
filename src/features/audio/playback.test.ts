import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import { BUNDLED_AUDIO_ASSETS } from './assets';
import {
  NORMAL_RATE,
  SLOW_RATE,
  SPEECH_LANGUAGE,
  playLessonAudio,
  resolveAudioSource,
  stopLessonAudio,
} from './playback';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
}));

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockRemove = jest.fn();
const mockSetPlaybackRate = jest.fn();

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: mockPlay,
    pause: mockPause,
    remove: mockRemove,
    setPlaybackRate: mockSetPlaybackRate,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

describe('resolveAudioSource', () => {
  it('returns null for content paths without bundled assets', () => {
    expect(resolveAudioSource('a1/hola.mp3')).toBeNull();
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

describe('playLessonAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to expo-speech (es-ES) when no file is available', async () => {
    const source = await playLessonAudio({
      audio: 'a1/missing.mp3',
      text: 'Hola',
      rate: NORMAL_RATE,
    });

    expect(source).toBe('speech');
    expect(Speech.speak).toHaveBeenCalledWith('Hola', {
      language: SPEECH_LANGUAGE,
      rate: NORMAL_RATE,
    });
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('uses slow rate 0.7 for speech fallback', async () => {
    await playLessonAudio({ text: 'Gracias', rate: SLOW_RATE });

    expect(Speech.speak).toHaveBeenCalledWith('Gracias', {
      language: SPEECH_LANGUAGE,
      rate: SLOW_RATE,
    });
  });

  it('plays via expo-audio when a remote file URI is provided', async () => {
    const source = await playLessonAudio({
      audio: 'https://cdn.example/clip.mp3',
      text: 'Hola',
      rate: SLOW_RATE,
    });

    expect(source).toBe('file');
    expect(setAudioModeAsync).toHaveBeenCalled();
    expect(createAudioPlayer).toHaveBeenCalledWith('https://cdn.example/clip.mp3');
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(SLOW_RATE, 'high');
    expect(mockPlay).toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
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
});
