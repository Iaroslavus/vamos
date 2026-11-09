import type { StudyFlashcardStep, StudyStep } from './types';
import {
  SWIPE_COMMIT_DISTANCE,
  SWIPE_FLICK_DISTANCE,
  SWIPE_FLICK_VELOCITY,
  applyMark,
  cardsLeft,
  currentCard,
  flashSummary,
  flashcardSteps,
  markForSwipe,
  repeatStillLearning,
  shuffleRemaining,
  startRound,
  swipeTilt,
  swipeTint,
} from './flashcards';

const hola = card('a', 'hola', 'привет');
const adios = card('b', 'adiós', 'пока');
const gracias = card('c', 'gracias', 'спасибо');

describe('flashcard deck', () => {
  it('keeps only flashcard steps', () => {
    expect(flashcardSteps([hola, { type: 'match_pairs' } as StudyStep])).toEqual([hola]);
  });

  it('counts know and still-learning, then replays only the second pile', () => {
    let round = startRound([hola, adios, gracias]);
    round = applyMark(round, 'know');
    round = applyMark(round, 'again');
    round = applyMark(round, 'again');

    expect(currentCard(round)).toBeNull();
    expect(flashSummary(round)).toEqual({
      know: 1,
      again: 2,
      againIds: ['b', 'c'],
    });

    const replay = repeatStillLearning(round);
    expect(replay.cards.map((item) => item.itemId)).toEqual(['b', 'c']);
    expect(replay.index).toBe(0);
    expect(flashSummary(replay)).toEqual({ know: 0, again: 0, againIds: [] });
  });

  it('ignores a second mark for a card that already advanced', () => {
    const round = applyMark(startRound([hola]), 'know');
    expect(applyMark(round, 'again')).toBe(round);
  });

  it('shuffles only the cards that are still ahead', () => {
    const marked = applyMark(startRound([hola, adios, gracias]), 'know');
    const shuffled = shuffleRemaining(marked, () => 0);
    expect(shuffled.cards.map((item) => item.id)).toEqual(['a', 'c', 'b']);
    expect(shuffled.know).toEqual(['a']);
    expect(cardsLeft(shuffled)).toBe(2);
    expect(
      shuffleRemaining(applyMark(shuffled, 'know'), () => 0).cards.map((item) => item.id),
    ).toEqual(['a', 'c', 'b']);
  });

  it('leaves a deck alone when the random source does not move any card', () => {
    const round = startRound([hola, adios, gracias]);
    expect(shuffleRemaining(round, () => 0.99).cards.map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('flashcard swipe', () => {
  it('treats a long drag to the right as know and to the left as still learning', () => {
    expect(markForSwipe(SWIPE_COMMIT_DISTANCE, 0)).toBe('know');
    expect(markForSwipe(-SWIPE_COMMIT_DISTANCE, 0)).toBe('again');
    expect(markForSwipe(SWIPE_COMMIT_DISTANCE, -5000)).toBe('know');
  });

  it('accepts a short flick and ignores a small or slow drag', () => {
    expect(markForSwipe(SWIPE_FLICK_DISTANCE, SWIPE_FLICK_VELOCITY)).toBe('know');
    expect(markForSwipe(-SWIPE_FLICK_DISTANCE, -SWIPE_FLICK_VELOCITY)).toBe('again');
    expect(markForSwipe(SWIPE_FLICK_DISTANCE - 1, 4000)).toBeNull();
    expect(markForSwipe(SWIPE_COMMIT_DISTANCE - 1, SWIPE_FLICK_VELOCITY - 1)).toBeNull();
    expect(markForSwipe(0, 0)).toBeNull();
  });

  it('leans the card with the drag and washes one side', () => {
    expect(swipeTilt(0)).toBe(0);
    expect(swipeTilt(160)).toBe(12);
    expect(swipeTilt(-320)).toBe(-12);
    expect(swipeTint(SWIPE_COMMIT_DISTANCE)).toEqual({ know: 1, again: 0 });
    expect(swipeTint(-SWIPE_COMMIT_DISTANCE / 2)).toEqual({ know: 0, again: 0.5 });
  });
});

function card(id: string, front: string, back: string): StudyFlashcardStep {
  return {
    id,
    type: 'flashcard',
    autoplay: false,
    itemId: id,
    direction: 'es_to_ru',
    front,
    back,
    phraseEs: front,
    phraseTr: back,
    audio: null,
  };
}
