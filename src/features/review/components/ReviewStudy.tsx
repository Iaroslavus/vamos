import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import type { ReviewRating } from '@/features/review/fsrs';
import { colors, space } from '@/theme/tokens';

import type { StudyCard } from '../hooks/useReviewSession';
import { FlipCard } from './FlipCard';
import { RatingChoices } from './RatingChoices';

type ReviewStudyProps = {
  card: StudyCard;
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
  index,
  total,
  revealed,
  busy,
  rateError,
  onReveal,
  onRate,
}: ReviewStudyProps) {
  const { t } = useTranslation();
  const spanishVisible = card.direction === 'es_to_ru' ? !revealed : revealed;

  useEffect(() => {
    if (!spanishVisible) {
      void stopLessonAudio();
      return;
    }
    void playLessonAudio({ text: card.es, audio: card.audio });
    return () => {
      void stopLessonAudio();
    };
  }, [card.audio, card.es, card.key, spanishVisible]);

  const replay = () => {
    void playLessonAudio({ text: card.es, audio: card.audio });
  };

  const speak = spanishVisible ? { speakLabel: t('review.playWord'), onSpeak: replay } : undefined;

  return (
    <View style={styles.body}>
      <ProgressBar
        progress={total === 0 ? 0 : index / total}
        accessibilityLabel={t('review.progress', { done: index, total })}
      />
      <View style={styles.card}>
        <FlipCard
          cardKey={card.key}
          revealed={revealed}
          front={{ text: card.front, ...(card.direction === 'es_to_ru' ? speak : undefined) }}
          back={{ text: card.back, ...(card.direction === 'ru_to_es' ? speak : undefined) }}
        />
      </View>
      {rateError ? (
        <Text variant="caption" color={colors.errorInk} style={styles.error}>
          {t('review.rateError')}
        </Text>
      ) : null}
      {revealed ? (
        <RatingChoices intervals={card.intervals} disabled={busy} onRate={onRate} />
      ) : (
        <Button title={t('review.showAnswer')} disabled={busy} onPress={onReveal} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: space.lg,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
  },
  error: {
    textAlign: 'center',
  },
});
