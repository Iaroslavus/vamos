import { act, render, screen, userEvent } from '@testing-library/react-native';

import { MATCH_SHAKE_MS } from '../hooks/useMatchPairs';
import type { MatchPairsItem } from '../store';
import { MatchPairsExercise } from './MatchPairsExercise';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

const user = userEvent.setup();

const EXERCISE: MatchPairsItem = {
  id: 'pairs',
  type: 'match_pairs',
  prompt_ru: 'Соедините пары',
  pairs: [
    { left: 'buenas tardes', right: 'добрий день' },
    { left: 'hola', right: 'привіт' },
  ],
  answer: 'buenas tardes::добрий день|hola::привіт',
};

async function press(name: string) {
  await user.press(screen.getByRole('button', { name }));
}

async function settleShake(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, MATCH_SHAKE_MS + 40));
  });
}

describe('MatchPairsExercise', () => {
  it('does nothing until both sides of a pair are chosen', async () => {
    const onSolved = jest.fn();
    await render(<MatchPairsExercise exercise={EXERCISE} onSolved={onSolved} />);

    await press('buenas tardes');

    expect(onSolved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'buenas tardes' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'добрий день' })).toBeEnabled();
  });

  it('locks a correct pair immediately', async () => {
    const onSolved = jest.fn();
    await render(<MatchPairsExercise exercise={EXERCISE} onSolved={onSolved} />);

    await press('buenas tardes');
    await press('добрий день');

    expect(screen.getByRole('button', { name: 'buenas tardes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'добрий день' })).toBeDisabled();
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('shakes a wrong pair, counts it, and finishes when the rest match', async () => {
    const onSolved = jest.fn();
    await render(<MatchPairsExercise exercise={EXERCISE} onSolved={onSolved} />);

    await press('buenas tardes');
    await press('привіт');
    expect(onSolved).not.toHaveBeenCalled();
    await settleShake();

    await press('buenas tardes');
    await press('добрий день');
    await press('hola');
    await press('привіт');

    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith({
      mistakes: 1,
      wrongKeys: ['buenas tardes', 'hola'],
    });
  });
});
