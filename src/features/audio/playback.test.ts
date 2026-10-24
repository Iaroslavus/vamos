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

  it('plays via expo-audio and applies rate after play (pitch preserved)', async () => {
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
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(SLOW_RATE, 'high');
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
    expect(mockSetPlaybackRate).toHaveBeenLastCalledWith(SLOW_RATE, 'high');
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
