import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashcardSession } from '@/features/study/components/FlashcardSession';
import { PairsBoardStatus } from '@/features/study/components/PairsBoardStatus';
import { PairsFinish } from '@/features/study/components/PairsFinish';
import { SessionBar } from '@/features/study/components/SessionBar';
import { StudySettingsForm } from '@/features/study/components/StudySettingsForm';
import { TimedPairGrid } from '@/features/study/components/TimedPairGrid';
import { buildTimedRounds, type TimedProgress } from '@/features/study/games/timedPairs';
import {
  DEFAULT_STUDY_SETTINGS,
  type StudyFlashcardStep,
  type StudyUnit,
} from '@/features/study/types';
import i18n from '@/i18n';
import { isUiLanguage } from '@/i18n/language';
import { colors, space } from '@/theme/tokens';

const PHRASES: readonly [string, string, string, string][] = [
  ['hola', 'hola', 'привіт', 'привет'],
  ['adios', 'adiós', 'до побачення', 'до свидания'],
  ['gracias', 'gracias', 'дякую', 'спасибо'],
  ['dias', 'buenos días', 'добрий ранок', 'доброе утро'],
  ['noches', 'buenas noches', 'добраніч', 'спокойной ночи'],
  ['por-favor', 'por favor', 'будь ласка', 'пожалуйста'],
];

/** Dev preview of the session chrome. Open /dev/session-ui?scene=pairs&lng=uk */
export default function DevSessionUiScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scene?: string; lng?: string }>();
  const scene = typeof params.scene === 'string' ? params.scene : 'cards';
  const language = typeof params.lng === 'string' ? params.lng : null;

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
      {scene === 'pairs' ? <PairsPreview /> : null}
      {scene === 'result' ? (
        <PairsFinish
          phase="done"
          timeMs={8600}
          recordMs={8600}
          fresh
          onNext={() => undefined}
          onClose={() => undefined}
        />
      ) : null}
      {scene === 'settings' ? (
        <StudySettingsForm settings={DEFAULT_STUDY_SETTINGS} onChange={() => undefined} />
      ) : null}
      {scene === 'cards' ? <FlashcardSession steps={cards()} onClose={() => undefined} /> : null}
    </View>
  );
}

function PairsPreview() {
  const tr = gloss();
  const round = useMemo(() => {
    const built = buildTimedRounds(
      PHRASES.map(([id, es, uk, ru]) => unit(id, es, tr === 'ru' ? ru : uk)),
      () => 0.2,
    );
    return built[0] ?? null;
  }, [tr]);
  if (!round) return null;
  const progress: TimedProgress = {
    matched: round.tiles
      .filter((tile) => tile.side === 'es')
      .slice(0, 3)
      .map((tile) => tile.itemId),
    pick: null,
    penalties: 0,
    miss: null,
  };

  return (
    <View style={styles.pairs}>
      <SessionBar current={2} total={4} onClose={() => undefined} onShuffle={() => undefined} />
      <PairsBoardStatus found={3} total={6} round={2} rounds={3} timer={null} />
      <TimedPairGrid
        round={round}
        progress={progress}
        disabled={false}
        onPress={() => undefined}
        onRetired={() => undefined}
      />
    </View>
  );
}

function gloss(): 'ru' | 'uk' {
  return i18n.language.startsWith('ru') ? 'ru' : 'uk';
}

function cards(): StudyFlashcardStep[] {
  const tr = gloss();
  return PHRASES.slice(0, 4).map(([id, es, uk, ru]) => ({
    id,
    type: 'flashcard',
    autoplay: false,
    itemId: id,
    direction: 'es_to_ru',
    front: es,
    back: tr === 'ru' ? ru : uk,
    phraseEs: es,
    phraseTr: tr === 'ru' ? ru : uk,
    audio: null,
  }));
}

function unit(id: string, es: string, tr: string): StudyUnit {
  return {
    id,
    es,
    tr,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  pairs: {
    flex: 1,
    gap: space.md,
  },
});
