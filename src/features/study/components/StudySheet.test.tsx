import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@/i18n';
import { colors, radius, space } from '@/theme/tokens';

import { studyModeCardStyle } from './StudyModeCard';
import { StudySheet } from './StudySheet';
import { STUDY_MODES, DEFAULT_STUDY_SETTINGS, type StudyMode, type StudyUnit } from '../types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const MODES = STUDY_MODES;

function phrase(overrides: Partial<StudyUnit> = {}): StudyUnit {
  return {
    id: 'hola.hola',
    es: 'hola',
    tr: 'привет',
    audio: null,
    introduced: true,
    state: 1,
    due: false,
    hard: false,
    recall: false,
    ...overrides,
  };
}

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

function renderSheet(
  units: readonly StudyUnit[],
  onStart: (mode: StudyMode) => void = () => undefined,
) {
  return render(
    host(
      <StudySheet
        visible
        units={units}
        settings={DEFAULT_STUDY_SETTINGS}
        onClose={() => undefined}
        onChangeSettings={() => undefined}
        onStart={onStart}
      />,
    ),
  );
}

function flatStyle(mode: StudyMode) {
  return StyleSheet.flatten(screen.getByTestId(`study-mode-${mode}`).props.style);
}

describe('StudySheet', () => {
  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('ru');
  });

  it('renders five equal buttons and recommends Вчити when nothing is due', async () => {
    await i18n.changeLanguage('uk');
    await renderSheet([phrase()]);

    expect(screen.getByText('Оберіть спосіб')).toBeTruthy();
    expect(screen.getByText('Рекомендовано')).toBeTruthy();
    expect(screen.queryByText(/до повторення/)).toBeNull();

    const learn = flatStyle('learn');
    for (const mode of MODES) {
      const card = screen.getByTestId(`study-mode-${mode}`);
      expect(card.props.accessibilityRole).toBe('button');
      const box = flatStyle(mode);
      expect(box).toEqual(
        expect.objectContaining({
          minHeight: learn.minHeight,
          padding: space.md,
          borderRadius: radius.lg,
          backgroundColor: colors.ground,
          gap: space.md,
          borderWidth: 1,
        }),
      );
      const icon = StyleSheet.flatten(screen.getByTestId(`study-mode-${mode}-icon`).props.style);
      expect(icon).toEqual(expect.objectContaining({ width: 44, height: 44 }));
    }

    expect(learn.borderColor).toBe(colors.coral);
    expect(flatStyle('flashcards').borderColor).toBe(colors.ground);
    expect(StyleSheet.flatten(studyModeCardStyle(true, true))).toEqual(
      expect.objectContaining({
        backgroundColor: colors.surfaceSunken,
        borderColor: colors.coral,
      }),
    );
    expect(StyleSheet.flatten(studyModeCardStyle(false, true))).toEqual(
      expect.objectContaining({
        backgroundColor: colors.surfaceSunken,
        borderColor: colors.surfaceSunken,
      }),
    );
    expect(StyleSheet.flatten(studyModeCardStyle(false, false)).backgroundColor).toBe(
      colors.ground,
    );
  });

  it('replaces the recommendation with the due count', async () => {
    await i18n.changeLanguage('ru');
    const onStart = jest.fn();
    await renderSheet([phrase({ due: true })], onStart);

    expect(screen.getByText('Выберите способ')).toBeTruthy();
    expect(screen.getByText('1 к повторению')).toBeTruthy();
    expect(screen.queryByText('Рекомендуем')).toBeNull();

    for (const mode of MODES) {
      expect(screen.getByTestId(`study-mode-${mode}`).props.accessibilityRole).toBe('button');
    }

    fireEvent(screen.getByTestId('study-mode-learn'), 'pressIn');
    fireEvent.press(screen.getByTestId('study-mode-learn'));
    expect(onStart).toHaveBeenCalledWith('learn');
  });
});
