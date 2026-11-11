import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SessionSummaryView } from '@/features/study/components/SessionSummary';
import type { SessionSummary } from '@/features/study/sessionSummary';
import i18n from '@/i18n';
import { isUiLanguage } from '@/i18n/language';
import { colors, space } from '@/theme/tokens';

const MISSES: SessionSummary = {
  variant: 'score',
  correct: 7,
  wrong: 3,
  percent: 70,
  repeatIds: ['hola', 'adios'],
  rows: [
    {
      key: 'hola',
      itemId: 'hola',
      phrase: 'hola',
      phraseEs: 'hola',
      audio: null,
      correct: 'привіт',
      yours: 'добрий',
      valueKind: 'text',
      score: null,
    },
    {
      key: 'adios',
      itemId: 'adios',
      phrase: 'adiós',
      phraseEs: 'adiós',
      audio: null,
      correct: 'до побачення',
      yours: 'па',
      valueKind: 'text',
      score: null,
    },
  ],
};

const PERFECT: SessionSummary = {
  variant: 'score',
  correct: 10,
  wrong: 0,
  percent: 100,
  repeatIds: [],
  rows: [],
};

const CARDS: SessionSummary = {
  variant: 'cards',
  correct: 6,
  wrong: 2,
  percent: 75,
  repeatIds: ['dias', 'gracias'],
  rows: [
    {
      key: 'dias',
      itemId: 'dias',
      phrase: 'buenos días',
      phraseEs: 'buenos días',
      audio: null,
      correct: 'добрий ранок',
      yours: null,
      valueKind: 'text',
      score: null,
    },
    {
      key: 'gracias',
      itemId: 'gracias',
      phrase: 'gracias',
      phraseEs: 'gracias',
      audio: null,
      correct: 'дякую',
      yours: null,
      valueKind: 'text',
      score: null,
    },
  ],
};

const SPEAK: SessionSummary = {
  variant: 'speak',
  correct: 1,
  wrong: 2,
  percent: 62,
  repeatIds: ['dias', 'como'],
  rows: [
    {
      key: 'dias',
      itemId: 'dias',
      phrase: 'buenos días',
      phraseEs: 'buenos días',
      audio: null,
      correct: 'добрий ранок',
      yours: null,
      valueKind: 'text',
      score: 42,
    },
    {
      key: 'como',
      itemId: 'como',
      phrase: '¿cómo estás?',
      phraseEs: '¿cómo estás?',
      audio: null,
      correct: 'як справи?',
      yours: null,
      valueKind: 'text',
      score: 55,
    },
  ],
};

const SAMPLES: Record<string, SessionSummary> = {
  misses: MISSES,
  perfect: PERFECT,
  cards: CARDS,
  speak: SPEAK,
};

/** Dev preview of the shared session summary. Open /dev/session-summary?sample=misses&lng=uk */
export default function DevSessionSummaryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sample?: string; lng?: string }>();
  const sample = typeof params.sample === 'string' ? params.sample : 'misses';
  const language = typeof params.lng === 'string' ? params.lng : null;
  const summary = SAMPLES[sample] ?? MISSES;

  useEffect(() => {
    if (isUiLanguage(language)) void i18n.changeLanguage(language);
  }, [language]);

  if (!__DEV__) return <Redirect href="/(tabs)" />;

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.md,
          paddingBottom: Math.max(insets.bottom, space.lg),
          paddingHorizontal: space.xl,
        },
      ]}
    >
      <SessionSummaryView summary={summary} onRepeat={() => undefined} onDone={() => undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
});
