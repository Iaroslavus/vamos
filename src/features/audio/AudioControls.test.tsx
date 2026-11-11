import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';

import { AudioControls } from './AudioControls';
import { playLessonAudio, SLOW_RATE } from './playback';

jest.mock('lucide-react-native', () => {
  // jest.mock is hoisted above imports, so the factory cannot use ESM imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native') as typeof import('react-native');
  const Icon = (props: object) => React.createElement(View, props);
  return { Turtle: Icon, Volume2: Icon };
});

jest.mock('./playback', () => ({
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
}));

function renderControls() {
  return render(
    <I18nextProvider i18n={i18n}>
      <AudioControls
        text="hola"
        audio="items/a1/hola/hola.es.normal.m4a"
        slowAudio="items/a1/hola/hola.es.slow.m4a"
      />
    </I18nextProvider>,
  );
}

describe('AudioControls', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ru');
  });

  it('keeps listen and slow, and drops the stop button', async () => {
    await renderControls();

    expect(screen.getByRole('button', { name: 'Слушать' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Медленно' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Стоп' })).toBeNull();
  });

  it('starts the phrase again when listen is tapped during playback', async () => {
    await renderControls();

    await fireEvent.press(screen.getByRole('button', { name: 'Слушать' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Слушать' }));

    expect(playLessonAudio).toHaveBeenNthCalledWith(1, {
      audio: 'items/a1/hola/hola.es.normal.m4a',
      text: 'hola',
      rate: 1,
    });
    expect(playLessonAudio).toHaveBeenNthCalledWith(2, {
      audio: 'items/a1/hola/hola.es.normal.m4a',
      text: 'hola',
      rate: 1,
    });
  });

  it('plays the slow clip from the slow button', async () => {
    await renderControls();

    await fireEvent.press(screen.getByRole('button', { name: 'Медленно' }));

    expect(playLessonAudio).toHaveBeenCalledWith({
      audio: 'items/a1/hola/hola.es.slow.m4a',
      text: 'hola',
      rate: SLOW_RATE,
    });
  });
});
