import { ACOUSTIC } from './config';
import {
  NATIVE_PCM_RATE,
  PLAYBACK_AUDIO_MODE,
  RECORDING_AUDIO_MODE,
  acousticRecordingOptions,
  captureRateIsNative,
  meterLevel,
  recordingInputReady,
} from './session';
import { decodeWavPcm, encodeWavPcm16 } from './wav';

const MIC = { uid: 'mic', name: 'Mac', type: 'MicrophoneBuiltIn' };

describe('acoustic recording session', () => {
  it('records hardware-rate linear PCM and lets the decoder make 16 kHz mono', () => {
    const options = acousticRecordingOptions();

    expect(options.extension).toBe('.wav');
    expect(options.sampleRate).toBe(NATIVE_PCM_RATE);
    expect(captureRateIsNative(options.sampleRate)).toBe(true);
    expect(options.sampleRate).not.toBe(ACOUSTIC.sampleRate);
    expect(options.numberOfChannels).toBe(1);
    expect(options.ios.outputFormat).toBe('lpcm');
    expect(options.ios.linearPCMBitDepth).toBe(16);
    expect(options.ios.linearPCMIsFloat).toBe(false);
    expect(options.ios.linearPCMIsBigEndian).toBe(false);

    const pcm = new Float32Array(options.sampleRate);
    pcm[100] = 0.4;
    const decoded = decodeWavPcm(encodeWavPcm16(pcm, options.sampleRate));
    expect(decoded.sampleRate).toBe(ACOUSTIC.sampleRate);
    expect(decoded.samples.length).toBe(ACOUSTIC.sampleRate);
  });

  it('turns recording on before a take and back off for playback', () => {
    expect(RECORDING_AUDIO_MODE).toMatchObject({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    expect(PLAYBACK_AUDIO_MODE).toMatchObject({
      allowsRecording: false,
      playsInSilentMode: true,
    });
  });

  it('accepts only the input that is selected and listed', () => {
    expect(recordingInputReady([MIC], MIC)).toBe(true);
    expect(recordingInputReady([], MIC)).toBe(false);
    expect(recordingInputReady([MIC], null)).toBe(false);
    expect(recordingInputReady([MIC], { uid: 'other' })).toBe(false);
    expect(recordingInputReady(undefined, undefined)).toBe(false);
  });

  it('maps silence and a full-scale meter onto 0…1', () => {
    expect(meterLevel(undefined)).toBe(0);
    expect(meterLevel(Number.NaN)).toBe(0);
    expect(meterLevel(-160)).toBe(0);
    expect(meterLevel(-60)).toBe(0);
    expect(meterLevel(-30)).toBeCloseTo(0.5);
    expect(meterLevel(0)).toBe(1);
    expect(meterLevel(3)).toBe(1);
  });
});
