import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { blankAudio, type Item } from '@/features/content/schema';
import i18n from '@/i18n';

import { PhraseRow } from './components/PhraseRow';
import { usePhrasePlayback } from './hooks/usePhrasePlayback';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/features/audio/playback', () => ({
  NORMAL_RATE: 1,
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(() => Promise.resolve()),
}));

const phrase: Item = {
  id: 'restaurante.mesa',
  type: 'phrase',
  es: 'Una mesa para dos, por favor',
  tr: {
    ru: 'Столик на двоих, пожалуйста',
    uk: 'Столик на двох, будь ласка',
    en: 'A table for two, please',
  },
  literal: null,
  parts: [],
  say: { ru: 'уна меса', uk: 'уна меса', en: 'una mesa' },
  note: null,
  why: null,
  level: 'A1',
  variant: 'both',
  audio: blankAudio(),
  tags: [],
  confusables: [],
  draft: false,
  draft_i18n: false,
};

function Harness() {
  const playback = usePhrasePlayback();
  return (
    <PhraseRow
      phrase={phrase.es}
      translation="Столик на двоих, пожалуйста"
      playing={playback.playingId === phrase.id}
      onPlay={() => playback.toggle(phrase)}
      onShow={() => undefined}
    />
  );
}

describe('phrase playback', () => {
  beforeEach(async () => {
    jest.mocked(playLessonAudio).mockClear();
    jest.mocked(stopLessonAudio).mockClear();
    await i18n.changeLanguage('ru');
  });

  it('plays on the first tap and stops on the second', async () => {
    await render(
      <I18nextProvider i18n={i18n}>
        <Harness />
      </I18nextProvider>,
    );
    jest.mocked(stopLessonAudio).mockClear();

    const label = 'Прослушать: Una mesa para dos, por favor';
    await fireEvent.press(screen.getByLabelText(label));

    expect(playLessonAudio).toHaveBeenCalledTimes(1);
    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Una mesa para dos, por favor',
        rate: 1,
      }),
    );
    expect(stopLessonAudio).not.toHaveBeenCalled();
    expect(screen.getByTestId('phrase-wave', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText(label).props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(screen.getByLabelText(label));
    expect(stopLessonAudio).toHaveBeenCalledTimes(1);
    expect(playLessonAudio).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('phrase-wave', { includeHiddenElements: true })).toBeNull();
  });
});
