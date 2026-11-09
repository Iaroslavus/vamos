import { Shuffle, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { stopLessonAudio } from '@/features/audio/playback';
import { useAudioPreference } from '@/features/audio/preference';
import type { AudioSpeed } from '@/features/audio/select';
import { colors, space } from '@/theme/tokens';

import { playFlashPhrase } from '../flashAudio';
import {
  applyMark,
  cardsLeft,
  currentCard,
  flashSummary,
  repeatStillLearning,
  shuffleRemaining,
  startRound,
  type FlashMark,
  type FlashRound,
} from '../flashcards';
import type { StudyFlashcardStep } from '../types';
import { FlashcardDeck } from './FlashcardDeck';
import { FlashcardSummary } from './FlashcardSummary';

type FlashcardSessionProps = {
  steps: readonly StudyFlashcardStep[];
  onClose: () => void;
  onAddDifficult: (itemIds: readonly string[]) => Promise<void>;
};

export function FlashcardSession({ steps, onClose, onAddDifficult }: FlashcardSessionProps) {
  const { t } = useTranslation();
  const preference = useAudioPreference();
  const [round, setRound] = useState<FlashRound>(() => startRound(steps));
  const [revealed, setRevealed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState(false);
  const card = currentCard(round);
  const summary = flashSummary(round);

  useEffect(() => {
    if (!card?.autoplay) return undefined;
    const spanishVisible = card.direction === 'ru_to_es' ? revealed : !revealed;
    if (!spanishVisible) {
      void stopLessonAudio();
      return undefined;
    }
    playFlashPhrase(card, 'normal', preference);
    return () => {
      void stopLessonAudio();
    };
  }, [card, preference, revealed]);

  const markCard = (stepId: string, mark: FlashMark) => {
    setRevealed(false);
    setRound((current) => {
      const active = currentCard(current);
      if (!active || active.id !== stepId) return current;
      return applyMark(current, mark);
    });
    void stopLessonAudio();
  };

  const shuffle = () => {
    setRevealed(false);
    setRound((current) => shuffleRemaining(current, Math.random));
    void stopLessonAudio();
  };

  const repeat = () => {
    setRevealed(false);
    setAdded(false);
    setAddError(false);
    setRound((current) => repeatStillLearning(current));
    void stopLessonAudio();
  };

  const add = () => {
    if (adding || added || summary.againIds.length === 0) return;
    setAdding(true);
    setAddError(false);
    void onAddDifficult(summary.againIds)
      .then(() => setAdded(true))
      .catch(() => setAddError(true))
      .finally(() => setAdding(false));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
        {card ? (
          <Text variant="bodyBold" style={styles.counter}>
            {t('study.flash.counter', { current: round.index + 1, total: round.cards.length })}
          </Text>
        ) : (
          <View style={styles.headerGap} />
        )}
        {card ? (
          <IconButton
            accessibilityLabel={t('study.flash.shuffle')}
            disabled={cardsLeft(round) < 2}
            onPress={shuffle}
          >
            <Shuffle size={22} color={colors.ink} strokeWidth={2.2} />
          </IconButton>
        ) : (
          <View style={styles.headerGap} />
        )}
      </View>
      {card ? (
        <FlashcardDeck
          card={card}
          revealed={revealed}
          onFlip={() => setRevealed((value) => !value)}
          onMark={(mark) => markCard(card.id, mark)}
          onPlay={(speed: AudioSpeed) => playFlashPhrase(card, speed, preference)}
        />
      ) : (
        <FlashcardSummary
          know={summary.know}
          again={summary.again}
          adding={adding}
          added={added}
          addError={addError}
          onRepeat={repeat}
          onAdd={add}
          onClose={onClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  counter: {
    flex: 1,
    textAlign: 'center',
  },
  headerGap: {
    flex: 1,
  },
});
