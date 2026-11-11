import {
  FAST_REMEMBER_MS,
  memoryForSwipe,
  ratingForMemory,
  ratingForSwipe,
  SWIPE_COMMIT_DISTANCE,
  SWIPE_FLICK_DISTANCE,
  SWIPE_FLICK_VELOCITY,
} from './memoryRating';

describe('ratingForMemory', () => {
  it('maps forgot to Again no matter how fast the tap is', () => {
    expect(ratingForMemory('forgot', 0)).toBe('again');
    expect(ratingForMemory('forgot', FAST_REMEMBER_MS - 1)).toBe('again');
    expect(ratingForMemory('forgot', FAST_REMEMBER_MS)).toBe('again');
    expect(ratingForMemory('forgot', 60_000)).toBe('again');
  });

  it('maps a remember under 3 seconds to Easy and the rest to Good', () => {
    expect(FAST_REMEMBER_MS).toBe(3_000);
    expect(ratingForMemory('remember', 0)).toBe('easy');
    expect(ratingForMemory('remember', 1_500)).toBe('easy');
    expect(ratingForMemory('remember', FAST_REMEMBER_MS - 1)).toBe('easy');
    expect(ratingForMemory('remember', FAST_REMEMBER_MS)).toBe('good');
    expect(ratingForMemory('remember', FAST_REMEMBER_MS + 1)).toBe('good');
    expect(ratingForMemory('remember', Number.POSITIVE_INFINITY)).toBe('good');
    expect(ratingForMemory('remember', Number.NaN)).toBe('good');
  });
});

describe('memoryForSwipe', () => {
  it('treats a long drag as the same choice as the buttons', () => {
    expect(memoryForSwipe(SWIPE_COMMIT_DISTANCE, 0)).toBe('remember');
    expect(memoryForSwipe(-SWIPE_COMMIT_DISTANCE, 0)).toBe('forgot');
    expect(memoryForSwipe(SWIPE_COMMIT_DISTANCE - 1, 0)).toBeNull();
    expect(memoryForSwipe(-(SWIPE_COMMIT_DISTANCE - 1), 0)).toBeNull();
  });

  it('accepts a short flick only when it is fast', () => {
    expect(memoryForSwipe(SWIPE_FLICK_DISTANCE, SWIPE_FLICK_VELOCITY)).toBe('remember');
    expect(memoryForSwipe(-SWIPE_FLICK_DISTANCE, -SWIPE_FLICK_VELOCITY)).toBe('forgot');
    expect(memoryForSwipe(SWIPE_FLICK_DISTANCE, SWIPE_FLICK_VELOCITY - 1)).toBeNull();
    expect(memoryForSwipe(-(SWIPE_FLICK_DISTANCE - 1), -SWIPE_FLICK_VELOCITY)).toBeNull();
    expect(memoryForSwipe(Number.NaN, 0)).toBeNull();
    expect(memoryForSwipe(0, Number.NaN)).toBeNull();
  });

  it('grades a swipe like the two buttons, including a fast Easy', () => {
    expect(ratingForSwipe(-SWIPE_COMMIT_DISTANCE, 0, 100)).toBe('again');
    expect(ratingForSwipe(SWIPE_COMMIT_DISTANCE, 0, FAST_REMEMBER_MS - 1)).toBe('easy');
    expect(ratingForSwipe(SWIPE_COMMIT_DISTANCE, 0, FAST_REMEMBER_MS)).toBe('good');
    expect(ratingForSwipe(10, 0, 0)).toBeNull();
  });
});
