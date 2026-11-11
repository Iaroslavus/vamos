import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { encodeWavPcm16 } from './wav';
import { MAX_TAKE_SECONDS, PLAYBACK_AUDIO_MODE, RECORDING_AUDIO_MODE } from './session';
import {
  openWavTake,
  stopSpeechRecognition,
  type PcmRecorder,
  type RecordingControls,
} from './record';

const speech = ExpoSpeechRecognitionModule as unknown as {
  __emit: (event: string, payload: unknown) => void;
};

function controls(over: Partial<RecordingControls> = {}): {
  io: RecordingControls;
  calls: string[];
} {
  const calls: string[] = [];
  const io: RecordingControls = {
    abortRecognition: async () => {
      calls.push('abort');
    },
    stopPlayback: async () => {
      calls.push('stop');
    },
    requestPermission: async () => {
      calls.push('permission');
      return { granted: true };
    },
    setAudioMode: async (mode) => {
      calls.push(mode.allowsRecording ? 'record-mode' : 'play-mode');
    },
    readFile: async () => {
      calls.push('read');
      const bytes = encodeWavPcm16(new Float32Array([0.25, -0.25]), 48_000);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    deleteFile: () => {
      calls.push('delete');
    },
    ...over,
  };
  return { io, calls };
}

function recorder(over: Partial<PcmRecorder> = {}): PcmRecorder & { record: jest.Mock } {
  let recording = false;
  const record = jest.fn(() => {
    recording = true;
  });
  return {
    prepareToRecordAsync: jest.fn(async () => undefined),
    getAvailableInputs: () => [{ uid: 'mic' }],
    getCurrentInput: async () => ({ uid: 'mic' }),
    record,
    stop: jest.fn(async () => {
      recording = false;
    }),
    getStatus: () => ({ isRecording: recording, url: 'file:///cache/take.wav' }),
    uri: 'file:///cache/take.wav',
    ...over,
  };
}

describe('stopSpeechRecognition', () => {
  it('resolves once recognition ends', async () => {
    const pending = stopSpeechRecognition();
    speech.__emit('end', {});
    await pending;
    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
  });
});

describe('openWavTake', () => {
  it('releases the microphone, then records only when an input is ready', async () => {
    const { io, calls } = controls();
    const mic = recorder();

    const take = await openWavTake(mic, io);

    expect(take).not.toBeNull();
    expect(calls).toEqual(['abort', 'stop', 'permission', 'record-mode']);
    expect(mic.record).toHaveBeenCalledWith({ forDuration: MAX_TAKE_SECONDS });
    expect(mic.prepareToRecordAsync).toHaveBeenCalled();
  });

  it('does not change the audio mode when the microphone permission is missing', async () => {
    const seen: string[] = [];
    const { io } = controls({
      abortRecognition: async () => {
        seen.push('abort');
      },
      stopPlayback: async () => {
        seen.push('stop');
      },
      requestPermission: async () => {
        seen.push('permission');
        return { granted: false };
      },
      setAudioMode: async () => {
        seen.push('mode');
      },
    });
    const mic = recorder();

    expect(await openWavTake(mic, io)).toBeNull();
    expect(mic.record).not.toHaveBeenCalled();
    expect(seen).toEqual(['abort', 'stop', 'permission']);
  });

  it('restores playback and does not record when the simulator input is missing', async () => {
    const { io, calls } = controls();
    const mic = recorder({
      getAvailableInputs: () => [],
      getCurrentInput: async () => {
        throw new Error('no input');
      },
    });

    expect(await openWavTake(mic, io)).toBeNull();
    expect(mic.record).not.toHaveBeenCalled();
    expect(calls.at(-1)).toBe('play-mode');
  });

  it('restores playback when prepare fails', async () => {
    const { io, calls } = controls();
    const mic = recorder({
      prepareToRecordAsync: jest.fn(async () => {
        throw new Error('Failed to prepare recorder');
      }),
    });

    expect(await openWavTake(mic, io)).toBeNull();
    expect(mic.record).not.toHaveBeenCalled();
    expect(calls).toContain('record-mode');
    expect(calls.at(-1)).toBe('play-mode');
  });

  it('does not record when the native recorder never leaves the idle state', async () => {
    const { io, calls } = controls();
    const mic = recorder({
      record: jest.fn(),
      getStatus: () => ({ isRecording: false, url: null }),
    });

    expect(await openWavTake(mic, io)).toBeNull();
    expect(calls.at(-1)).toBe('play-mode');
  });

  it('reads the wav, resamples it, and returns the session to playback', async () => {
    const { io, calls } = controls();
    const take = await openWavTake(recorder(), io);
    const result = await take?.finish();

    expect(result?.uri).toBe('file:///cache/take.wav');
    expect(result?.samples?.length).toBeGreaterThan(0);
    expect(calls).toContain('read');
    expect(calls).toContain('play-mode');
    expect(calls.indexOf('play-mode')).toBeLessThan(calls.indexOf('read'));
    expect(RECORDING_AUDIO_MODE.allowsRecording).toBe(true);
    expect(PLAYBACK_AUDIO_MODE.allowsRecording).toBe(false);
  });

  it('keeps the file uri when the bytes are not a wav', async () => {
    const { io } = controls({
      readFile: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    const take = await openWavTake(recorder(), io);

    await expect(take?.finish()).resolves.toEqual({
      samples: null,
      uri: 'file:///cache/take.wav',
    });
  });

  it('still reads the file when stop fails after the cap has ended the take', async () => {
    const { io, calls } = controls();
    const mic = recorder({
      stop: jest.fn(async () => {
        throw new Error('stop failed');
      }),
    });
    const take = await openWavTake(mic, io);

    const result = await take?.finish();
    expect(result?.uri).toBe('file:///cache/take.wav');
    expect(result?.samples?.length).toBeGreaterThan(0);
    expect(calls.filter((call) => call === 'play-mode')).toHaveLength(1);
  });

  it('records for the caller duration instead of the safety cap', async () => {
    const { io } = controls();
    const mic = recorder();

    await openWavTake(mic, io, 3);

    expect(mic.record).toHaveBeenCalledWith({ forDuration: 3 });
  });
});
