import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { stopLessonAudio } from '@/features/audio/playback';
import { useAudioPreference } from '@/features/audio/preference';
import type { AudioSpeed } from '@/features/audio/select';
import { space } from '@/theme/tokens';

import { playFlashPhrase } from '../flashAudio';
import {
  applyMark,
  cardsLeft,
  currentCard,
  repeatStillLearning,
  shuffleRemaining,
  startRound,
  type FlashMark,
  type FlashRound,
} from '../flashcards';
import { summarizeCards } from '../sessionSummary';
import type { StudyFlashcardStep, StudySettings } from '../types';
import { FlashcardDeck } from './FlashcardDeck';
import { SessionBar } from './SessionBar';
import { SessionSummaryView } from './SessionSummary';

type FlashcardSessionProps = {
  steps: readonly StudyFlashcardStep[];
  onClose: () => void;
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
  /** «Still learning» writes Again so the phrase shows up sooner in Learn. */
  onStillLearning?: (input: {
    itemId: string;
    direction: StudyFlashcardStep['direction'];
    clientId: string;
  }) => void;
};

export function FlashcardSession({
  steps,
  onClose,
  settings,
  onChangeSettings,
  onStillLearning,
}: FlashcardSessionProps) {
  const preference = useAudioPreference();
  const markSeq = useRef(0);
  const [round, setRound] = useState<FlashRound>(() => startRound(steps));
  const [revealed, setRevealed] = useState(false);
  const card = currentCard(round);
  const summary = summarizeCards(round);

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
    if (mark === 'again' && card && card.id === stepId) {
      markSeq.current += 1;
      onStillLearning?.({
        itemId: card.itemId,
        direction: card.direction,
        clientId: `flash-again:${card.itemId}:${card.direction}:${markSeq.current}`,
      });
    }
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
    setRound((current) => repeatStillLearning(current));
    void stopLessonAudio();
  };

  return (
    <View style={styles.root}>
      <SessionBar
        current={card ? round.index + 1 : round.cards.length}
        total={round.cards.length}
        onClose={onClose}
        onShuffle={card ? shuffle : undefined}
        shuffleDisabled={!card || cardsLeft(round) < 2}
        settings={settings}
        onChangeSettings={onChangeSettings}
      />
      {card ? (
        <FlashcardDeck
          card={card}
          revealed={revealed}
          onFlip={() => setRevealed((value) => !value)}
          onMark={(mark) => markCard(card.id, mark)}
          onPlay={(speed: AudioSpeed) => playFlashPhrase(card, speed, preference)}
        />
      ) : (
        <SessionSummaryView summary={summary} onRepeat={repeat} onDone={onClose} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
});
