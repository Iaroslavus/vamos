import { IOS_AV_SPEECH_DEFAULT_RATE, speechEngineRate } from './speechRate';

describe('speechEngineRate', () => {
  it('keeps normal speed at expo-speech rate 1', () => {
    expect(speechEngineRate(1, 'ios')).toBe(1);
  });

  it('maps iOS 0.7 onto the measured curve (~1.43× onDone, not native 0.35)', () => {
    const optionRate = speechEngineRate(0.7, 'ios');
    const nativeRate = optionRate * IOS_AV_SPEECH_DEFAULT_RATE;

    expect(optionRate).toBeCloseTo(0.352, 2);
    expect(nativeRate).toBeGreaterThan(0.17);
    expect(nativeRate).toBeLessThan(0.19);
    expect(optionRate).not.toBe(0.7);
  });

  it('does not remap Android, where setSpeechRate is linear', () => {
    expect(speechEngineRate(0.7, 'android')).toBe(0.7);
    expect(speechEngineRate(1, 'android')).toBe(1);
  });
});
