import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { playLessonAudio, SLOW_RATE } from '@/features/audio/playback';
import i18n from '@/i18n';

import { useLessonStore, type ListenSelectItem } from '../store';
import { ListenSelectExercise } from './ListenSelectExercise';

jest.mock('lucide-react-native', () => {
  // jest.mock is hoisted above imports, so the factory cannot use ESM imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native') as typeof import('react-native');
  const Icon = (props: object) => React.createElement(View, props);
  return { Square: Icon, Turtle: Icon, Volume2: Icon };
});

jest.mock('@/features/audio/playback', () => ({
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(() => Promise.resolve()),
}));

const listen: ListenSelectItem = {
  id: 'e0',
  type: 'listen_select',
  prompt_ru: 'Что вы слышите?',
  options: ['Hola', 'Adiós'],
  answer: 'Hola',
  audio: 'a1/u01/l01-e04.mp3',
  speakText: 'Hola',
};

function renderExercise(exercise: ListenSelectItem, disabled = false) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ListenSelectExercise
        exercise={exercise}
        selected=""
        disabled={disabled}
        onSelect={jest.fn()}
      />
    </I18nextProvider>,
  );
}

describe('ListenSelectExercise slow button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLessonStore.getState().reset();
  });

  it('calls the audio service with rate 0.7 in the normal exercise', async () => {
    await renderExercise(listen);

    fireEvent.press(screen.getByLabelText('Медленно'));

    expect(playLessonAudio).toHaveBeenCalledWith({
      audio: listen.audio,
      text: listen.speakText,
      rate: SLOW_RATE,
    });
  });

  it('calls the audio service with rate 0.7 during the mistakes retry', async () => {
    useLessonStore.getState().startLesson({
      lessonId: 'a1-u01-l01',
      exercises: [listen],
    });
    useLessonStore.getState().setAnswer('Adiós');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    expect(useLessonStore.getState().status).toBe('mistakes_intro');
    useLessonStore.getState().continueMistakesIntro();

    const exercise = useLessonStore.getState().getCurrentExercise();
    expect(exercise?.type).toBe('listen_select');
    if (exercise?.type !== 'listen_select') return;

    await renderExercise(exercise, useLessonStore.getState().status !== 'active');

    fireEvent.press(screen.getByLabelText('Медленно'));

    expect(playLessonAudio).toHaveBeenCalledWith({
      audio: 'a1/u01/l01-e04.mp3',
      text: 'Hola',
      rate: SLOW_RATE,
    });
  });
});
