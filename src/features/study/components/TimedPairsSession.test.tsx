import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { displayText } from '@/features/content/displayText';
import i18n from '@/i18n';

import { pairsRecordKey, parsePairsRecord, serializePairsRecord } from '../games/pairsRecord';
import type { StudyUnit } from '../types';
import { TimedPairsSession } from './TimedPairsSession';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/hooks/useReduceMotion', () => ({
  useReduceMotion: () => false,
}));

function host(children: ReactNode) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

function word(index: number): StudyUnit {
  return {
    id: `u${index}`,
    es: `es${index}`,
    tr: `tr${index}`,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  };
}

async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name: displayText(name) }));
}

describe('TimedPairsSession', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('adds a second for a miss and does not store a short board', async () => {
    await render(
      host(
        <TimedPairsSession
          units={[word(0), word(1)]}
          userId="user"
          folderId="folder"
          onClose={jest.fn()}
        />,
      ),
    );

    expect(await screen.findByText('Рекорда пока нет')).toBeTruthy();
    await press('es0');
    await press('tr1');
    expect(screen.getByText('Штраф 1 секунда')).toBeTruthy();

    await press('es0');
    await press('tr0');
    await press('es1');
    await press('tr1');

    expect(await screen.findByText('Пары собраны')).toBeTruthy();
    expect(await AsyncStorage.getItem(pairsRecordKey('user', 'folder'))).toBeNull();
  });

  it('saves a faster full board and keeps a better record', async () => {
    const key = pairsRecordKey('user', 'folder');
    await AsyncStorage.setItem(key, serializePairsRecord(1));
    const units = Array.from({ length: 6 }, (_, index) => word(index));
    await render(
      host(<TimedPairsSession units={units} userId="user" folderId="folder" onClose={jest.fn()} />),
    );

    expect(await screen.findByText('Рекорд 0:00.0')).toBeTruthy();
    for (let index = 0; index < 6; index += 1) {
      await press(`es${index}`);
      await press(`tr${index}`);
    }

    expect(await screen.findByText('Пары собраны')).toBeTruthy();
    expect(screen.queryByText('Новый рекорд')).toBeNull();
    expect(parsePairsRecord(await AsyncStorage.getItem(key))).toBe(1);
  });

  it('stores the first full-board time as the folder record', async () => {
    const key = pairsRecordKey('user', 'folder');
    const units = Array.from({ length: 6 }, (_, index) => word(index));
    await render(
      host(<TimedPairsSession units={units} userId="user" folderId="folder" onClose={jest.fn()} />),
    );

    expect(await screen.findByText('Рекорда пока нет')).toBeTruthy();
    for (let index = 0; index < 6; index += 1) {
      await press(`es${index}`);
      await press(`tr${index}`);
    }

    expect(await screen.findByText('Новый рекорд')).toBeTruthy();
    expect(parsePairsRecord(await AsyncStorage.getItem(key))).toEqual(expect.any(Number));
  });
});
