import { Platform } from 'react-native';

/**
 * `AVSpeechUtteranceDefaultSpeechRate` on iOS.
 * expo-speech sets `utterance.rate = options.rate * IOS_AV_SPEECH_DEFAULT_RATE`.
 */
export const IOS_AV_SPEECH_DEFAULT_RATE = 0.5;

/**
 * didStart→didFinish duration relative to native rate 0.5, after the
 * es-ES voice is already warm. iPhone 16e / iOS 26.3, phrase "Hasta luego".
 *
 * Buffer length at native 0.35 (what JS `rate: 0.7` becomes) is only ~1.21×,
 * and the utterance clock the app logs is even closer to 1× — Slow sounds
 * normal. The clock jumps to ~1.43× around native 0.176 (JS rate ~0.35).
 */
const IOS_DURATION_BY_NATIVE_RATE: readonly { native: number; ratio: number }[] = [
  { native: 0.5, ratio: 1 },
  { native: 0.22, ratio: 1.357 },
  { native: 0.19, ratio: 1.361 },
  { native: 0.17, ratio: 1.459 },
  { native: 0.15, ratio: 1.466 },
  { native: 0.13, ratio: 1.542 },
];

function nativeRateForDurationRatio(targetRatio: number): number {
  const first = IOS_DURATION_BY_NATIVE_RATE[0];
  if (!first || targetRatio <= first.ratio) return first?.native ?? IOS_AV_SPEECH_DEFAULT_RATE;

  for (let index = 1; index < IOS_DURATION_BY_NATIVE_RATE.length; index += 1) {
    const prev = IOS_DURATION_BY_NATIVE_RATE[index - 1];
    const next = IOS_DURATION_BY_NATIVE_RATE[index];
    if (!prev || !next || targetRatio > next.ratio) continue;

    const span = next.ratio - prev.ratio;
    const t = span === 0 ? 0 : (targetRatio - prev.ratio) / span;
    return prev.native + (next.native - prev.native) * t;
  }

  const last = IOS_DURATION_BY_NATIVE_RATE[IOS_DURATION_BY_NATIVE_RATE.length - 1];
  return last?.native ?? first.native;
}

/**
 * Map a playback multiplier (1 = normal, 0.7 = slow) to the `rate` expo-speech
 * should receive.
 *
 * Android `TextToSpeech.setSpeechRate` is already linear. iOS is not: the
 * lower half of `AVSpeechUtterance.rate` is compressed, so the value is
 * interpolated against the measured duration curve.
 */
export function speechEngineRate(playbackRate: number, os: string = Platform.OS): number {
  if (os !== 'ios') return playbackRate;
  if (!(playbackRate > 0) || playbackRate >= 1) return playbackRate;

  return nativeRateForDurationRatio(1 / playbackRate) / IOS_AV_SPEECH_DEFAULT_RATE;
}
