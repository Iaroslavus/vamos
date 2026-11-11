import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
import { IntroAudioButtons } from '@/features/lesson/components/IntroAudioButtons';
import type { AudioSpeed } from '@/features/audio/select';
import { colors, space } from '@/theme/tokens';

import type { FlashMark } from '../flashcards';
import type { StudyFlashcardStep } from '../types';
import { FlashCard } from './FlashCard';

type FlashcardDeckProps = {
  card: StudyFlashcardStep;
  revealed: boolean;
  onFlip: () => void;
  onMark: (mark: FlashMark) => void;
  onPlay: (speed: AudioSpeed) => void;
};

export function FlashcardDeck({ card, revealed, onFlip, onMark, onPlay }: FlashcardDeckProps) {
  const { t } = useTranslation();
  const face = revealed ? card.back : card.front;
  const play = (rate: number) => onPlay(rate < 1 ? 'slow' : 'normal');

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <FlashCard
          cardKey={card.id}
          front={card.front}
          back={card.back}
          revealed={revealed}
          knowLabel={t('study.flash.know')}
          againLabel={t('study.flash.again')}
          flipLabel={t('study.flash.flipLabel', { text: displayText(face) })}
          onFlip={onFlip}
          onMark={onMark}
          renderAudio={() => <IntroAudioButtons onPlay={play} />}
        />
        <Text variant="caption" color={colors.inkMuted} style={styles.hint}>
          {t('study.flash.flipHint')}
        </Text>
      </View>
      <View style={styles.row}>
        <Button
          title={t('study.flash.again')}
          variant="secondary"
          onPress={() => onMark('again')}
          style={styles.grow}
        />
        <Button
          title={t('study.flash.know')}
          variant="success"
          onPress={() => onMark('know')}
          style={styles.grow}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    gap: space.sm,
  },
  hint: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  grow: {
    flex: 1,
  },
});
