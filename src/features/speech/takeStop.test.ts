import { MAX_TAKE_MS, SILENCE_AFTER_SPEECH_MS, takeLimitMs, takeStopReason } from './takeStop';

describe('takeLimitMs', () => {
  it('caps a take at twice the sample and never more than 8 seconds', () => {
    expect(takeLimitMs(1_500)).toBe(3_000);
    expect(takeLimitMs(5_000)).toBe(MAX_TAKE_MS);
    expect(takeLimitMs(12_000)).toBe(8_000);
  });

  it('uses the 8 second cap when the sample length is unknown', () => {
    expect(takeLimitMs(null)).toBe(MAX_TAKE_MS);
    expect(takeLimitMs(undefined)).toBe(MAX_TAKE_MS);
    expect(takeLimitMs(0)).toBe(MAX_TAKE_MS);
    expect(takeLimitMs(Number.NaN)).toBe(MAX_TAKE_MS);
    expect(takeLimitMs(-200)).toBe(MAX_TAKE_MS);
  });
});

describe('takeStopReason', () => {
  const limitMs = 4_000;

  it('does not stop on silence before any speech', () => {
    expect(
      takeStopReason({
        elapsedMs: 1_500,
        limitMs,
        speechHeard: false,
        silenceMs: 1_500,
      }),
    ).toBeNull();
  });

  it('stops about a second after speech falls silent', () => {
    expect(
      takeStopReason({
        elapsedMs: 2_000,
        limitMs,
        speechHeard: true,
        silenceMs: SILENCE_AFTER_SPEECH_MS - 1,
      }),
    ).toBeNull();
    expect(
      takeStopReason({
        elapsedMs: 2_000,
        limitMs,
        speechHeard: true,
        silenceMs: SILENCE_AFTER_SPEECH_MS,
      }),
    ).toBe('silence');
  });

  it('stops at the duration cap even while speech continues', () => {
    expect(
      takeStopReason({
        elapsedMs: limitMs,
        limitMs,
        speechHeard: true,
        silenceMs: 0,
      }),
    ).toBe('limit');
  });
});
