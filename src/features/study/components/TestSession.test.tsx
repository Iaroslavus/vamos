import { fireEvent, render, waitFor, type RenderResult } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { displayText } from '@/features/content/displayText';
import i18n from '@/i18n';

import { planTest, type TestChoiceQuestion } from '../testMode';
import { DEFAULT_TEST_SETTINGS, type StudyUnit, type TestSettings } from '../types';
import { TestSession } from './TestSession';

jest.mock('@/features/audio/playback', () => ({
  playLessonAudio: jest.fn(async () => 'speech'),
  stopLessonAudio: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

const safeArea = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function host(children: ReactNode) {
  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider initialMetrics={safeArea}>{children}</SafeAreaProvider>
    </I18nextProvider>
  );
}

function word(id: string, es: string, tr: string): StudyUnit {
  return {
    id,
    es,
    tr,
    audio: `${id}.mp3`,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  };
}

const UNITS = Array.from({ length: 12 }, (_, index) =>
  word(`id${index}`, `es${index}`, `tr${index}`),
);

let ui: RenderResult;

async function renderTest(
  settings: TestSettings = { ...DEFAULT_TEST_SETTINGS, kinds: ['choice'] },
  units: readonly StudyUnit[] = UNITS,
) {
  const onRecord = jest.fn(async () => undefined);
  const onChange = jest.fn();
  ui = await render(
    host(
      <TestSession
        units={units}
        settings={settings}
        onChangeSettings={onChange}
        onRecord={onRecord}
        onClose={jest.fn()}
      />,
    ),
  );
  return { onRecord, onChange };
}

async function answerPaper(correct: boolean) {
  const questions = planTest(UNITS, { ...DEFAULT_TEST_SETTINGS, kinds: ['choice'] });
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index] as TestChoiceQuestion;
    const choice = correct
      ? question.answer
      : (question.options.find((option) => option !== question.answer) ?? question.answer);
    await fireEvent.press(ui.getByRole('button', { name: displayText(choice) }));
    const last = index === questions.length - 1;
    expect(ui.queryByText('Ошибки')).toBeNull();
    await fireEvent.press(ui.getByRole('button', { name: last ? 'Сдать' : 'Дальше' }));
  }
}

describe('TestSession', () => {
  it('offers 10, 20, and 30 questions and the four types', async () => {
    const { onChange } = await renderTest();
    expect(ui.getByRole('radio', { name: '10 вопросов' })).toBeTruthy();
    expect(ui.getByRole('radio', { name: '20 вопросов' })).toBeTruthy();
    expect(ui.getByRole('radio', { name: '30 вопросов' })).toBeTruthy();
    expect(ui.getByRole('checkbox', { name: 'Выбор' })).toBeTruthy();
    expect(ui.getByRole('checkbox', { name: 'Ввод' })).toBeTruthy();
    expect(ui.getByRole('checkbox', { name: 'Верно/неверно' })).toBeTruthy();
    expect(ui.getByRole('checkbox', { name: 'Пары' })).toBeTruthy();

    await fireEvent.press(ui.getByRole('radio', { name: '30 вопросов' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ count: 30 }));
  });

  it('holds feedback until the paper is handed in, then records Good', async () => {
    const { onRecord } = await renderTest();
    await fireEvent.press(ui.getByRole('button', { name: 'Начать' }));
    expect(ui.getByTestId('test-counter')).toHaveTextContent('1 / 10');
    expect(ui.queryByRole('button', { name: 'Сдать' })).toBeNull();

    await answerPaper(true);

    expect(await ui.findByText('Правильно: 10 · Ошибок: 0')).toBeTruthy();
    expect(ui.getByText('100%')).toBeTruthy();
    expect(ui.getByText('Без единой ошибки!')).toBeTruthy();
    expect(ui.queryByRole('button', { name: 'Повторить ошибки' })).toBeNull();
    await waitFor(() => expect(onRecord).toHaveBeenCalledTimes(10));
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'id0',
        direction: 'es_to_ru',
        grade: 'correct_first',
        stepId: '1:id0:es_to_ru',
      }),
    );
  });

  it('lists a miss as yours to correct, then retries only those phrases', async () => {
    const { onRecord } = await renderTest();
    const questions = planTest(UNITS, { ...DEFAULT_TEST_SETTINGS, kinds: ['choice'] });
    const first = questions[0] as TestChoiceQuestion;
    const wrong = first.options.find((option) => option !== first.answer) ?? '';

    await fireEvent.press(ui.getByRole('button', { name: 'Начать' }));
    await answerPaper(false);

    expect(await ui.findByText(`Вы ответили: ${displayText(wrong)}`)).toBeTruthy();
    expect(ui.getByText(displayText(first.answer))).toBeTruthy();
    expect(ui.getByLabelText(`Озвучить ${displayText(first.prompt)}, ошибка 1`)).toBeTruthy();
    expect(ui.queryByRole('button', { name: 'В Сложные' })).toBeNull();
    await waitFor(() => expect(onRecord).toHaveBeenCalled());
    expect(onRecord.mock.calls.every((call) => call[0].grade === 'incorrect')).toBe(true);

    await fireEvent.press(ui.getByRole('button', { name: 'Повторить ошибки' }));
    expect(ui.queryByText('Правильно: 0 · Ошибок: 10')).toBeNull();
    expect(ui.getByTestId('test-counter')).toHaveTextContent('1 / 10');
    expect(ui.queryByText('Ошибки')).toBeNull();
  });

  it('does not start a pairs test from a single phrase', async () => {
    await renderTest({ count: 10, kinds: ['pairs'], direction: 'es_to_ru' }, [
      word('hola', 'hola', 'привет'),
    ]);
    expect(ui.getByText('Для выбранных типов пока мало фраз.')).toBeTruthy();
    expect(ui.getByRole('button', { name: 'Начать' })).toBeDisabled();
  });
});
