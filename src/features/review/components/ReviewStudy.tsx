import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { play, stopLessonAudio } from '@/features/audio/playback';
import { useAudioPreference } from '@/features/audio/preference';
import type { AudioPreference } from '@/features/audio/select';
import { getItem } from '@/features/content/loader';
import { blankAudio } from '@/features/content/schema';
import type { ReviewRating } from '@/features/review/fsrs';
import { useAdvancedRatingStore } from '@/features/settings/advancedRatingStore';
import { colors, space } from '@/theme/tokens';

import type { StudyCard } from '../hooks/useReviewSession';
import { ReviewDeck } from './ReviewDeck';

type ReviewStudyProps = {
  card: StudyCard;
  nextCard: StudyCard | null;
  index: number;
  total: number;
  revealed: boolean;
  busy: boolean;
  rateError: boolean;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
};

export function ReviewStudy({
  card,
  nextCard,
  index,
  total,
  revealed,
  busy,
  rateError,
  onReveal,
  onRate,
}: ReviewStudyProps) {
  const { t } = useTranslation();
  const advanced = useAdvancedRatingStore((state) => state.enabled);
  const preference = useAudioPreference();
  const spanishVisible = card.direction === 'es_to_ru' ? !revealed : revealed;

  useEffect(() => {
    if (!spanishVisible) {
      void stopLessonAudio();
      return;
    }
    playCard(card.itemId, card.es, card.audio, preference);
    return () => {
      void stopLessonAudio();
    };
  }, [card.audio, card.es, card.itemId, card.key, preference, spanishVisible]);

  const replay = () => {
    playCard(card.itemId, card.es, card.audio, preference);
  };

  return (
    <View style={styles.body}>
      <ProgressBar
        progress={total === 0 ? 0 : index / total}
        accessibilityLabel={t('review.progress', { done: index, total })}
      />
      {rateError ? (
        <Text variant="caption" color={colors.errorInk} style={styles.error}>
          {t('review.rateError')}
        </Text>
      ) : null}
      <ReviewDeck
        card={card}
        nextCard={nextCard}
        revealed={revealed}
        busy={busy}
        rateError={rateError}
        advanced={advanced}
        speakLabel={t('review.playWord')}
        onSpeak={replay}
        onReveal={onReveal}
        onRate={onRate}
      />
    </View>
  );
}

function playCard(
  itemId: string,
  text: string,
  fallback: string | undefined,
  preference: AudioPreference,
): void {
  try {
    void play(getItem(itemId), 'normal', preference);
  } catch {
    void play(
      { es: text, audio: blankAudio(fallback ? { es: fallback } : {}) },
      'normal',
      preference,
    );
  }
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: space.lg,
  },
  error: {
    textAlign: 'center',
  },
});
