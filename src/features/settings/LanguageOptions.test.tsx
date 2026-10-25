import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';

import WelcomeScreen from '../../../app/(onboarding)/onboarding/index';
import NameScreen from '../../../app/(onboarding)/onboarding/name';
import SettingsScreen from '../../../app/settings';
import i18n from '@/i18n';
import { resetClaimedUiLanguage } from '@/i18n/preference';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/features/learner/useLearnerProfile', () => ({
  useSaveLearner: () => () => Promise.resolve(),
  useLearnerProfile: () => ({ data: undefined }),
}));

function renderWith(node: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

describe('interface language', () => {
  beforeEach(async () => {
    resetClaimedUiLanguage();
    await i18n.changeLanguage('ru');
  });

  it('switches the list check and the active language without remounting', async () => {
    await renderWith(<SettingsScreen />);

    expect(screen.getByRole('header', { name: 'Язык интерфейса' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Русский, выбран' })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('radio', { name: 'Українська' }));

    expect(await screen.findByRole('radio', { name: 'Українська, выбран' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Язык интерфейса' })).toBeOnTheScreen();
    expect(i18n.language).toBe('uk');
    expect(i18n.t('topics.phraseCount', { count: 2 })).toBe('2 фразы');

    fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('radio', { name: 'English, выбран' })).toBeOnTheScreen();
    expect(i18n.language).toBe('en');
    expect(i18n.t('topics.phraseCount', { count: 2 })).toBe('2 фраз');
  });

  it('offers the switcher on the welcome screen', async () => {
    await renderWith(<WelcomeScreen />);
    expect(screen.getByRole('radio', { name: 'English' })).toBeOnTheScreen();
  });

  it('offers the switcher on the name screen', async () => {
    await renderWith(<NameScreen />);
    expect(screen.getByRole('radio', { name: 'English' })).toBeOnTheScreen();
  });
});
