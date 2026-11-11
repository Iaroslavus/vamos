import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type AnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion, space } from '@/theme/tokens';

import type { ReviewRating } from '../fsrs';
import { reviewSlots, reviewTiming, type ReviewFlight } from '../flight';
import type { StudyCard } from '../hooks/useReviewSession';
import { useReviewFlight } from '../hooks/useReviewFlight';
import { ratingForSwipe } from '../memoryRating';
import { FlipCard } from './FlipCard';
import { RatingChoices } from './RatingChoices';

const FALLBACK_OFFSCREEN = 640;

type ReviewDeckProps = {
  card: StudyCard;
  nextCard: StudyCard | null;
  revealed: boolean;
  busy: boolean;
  rateError: boolean;
  advanced: boolean;
  speakLabel: string;
  onSpeak: () => void;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
};

export function ReviewDeck(props: ReviewDeckProps) {
  const { t } = useTranslation();
  const deck = useCardMotion(props);
  const slots = reviewSlots(props.card, props.nextCard, deck.flight);
  const waiting = deck.flight != null;
  const caption = deck.flight?.phase === 'fly' ? deck.flight : null;

  return (
    <View style={styles.body}>
      <GestureDetector gesture={deck.gesture}>
        <View style={styles.stage} collapsable={false} onLayout={deck.onLayout}>
          <View style={styles.stack}>
            {slots.map((slot) => (
              <CardSlot
                key={slot.card.key}
                card={slot.card}
                role={slot.role}
                style={slot.role === 'front' ? deck.frontStyle : deck.backStyle}
                revealed={
                  slot.role === 'front' && (caption != null || (!waiting && props.revealed))
                }
                interactive={slot.role === 'front' && !waiting}
                speak={
                  slot.role === 'front' && slot.card.key === props.card.key
                    ? { speakLabel: props.speakLabel, onSpeak: props.onSpeak }
                    : undefined
                }
              />
            ))}
            {caption ? (
              <Text variant="bodyBold" accessibilityLiveRegion="polite" style={styles.caption}>
                {t('review.returnsIn', {
                  when: t(`review.${caption.leaving.intervals[caption.rating].unit}`, {
                    count: caption.leaving.intervals[caption.rating].count,
                  }),
                })}
              </Text>
            ) : null}
          </View>
        </View>
      </GestureDetector>
      {waiting || !props.revealed ? (
        <Button
          title={t('review.showAnswer')}
          large
          disabled={props.busy || waiting}
          onPress={deck.reveal}
        />
      ) : (
        <RatingChoices
          advanced={props.advanced}
          disabled={props.busy}
          onMemory={deck.gradeMemory}
          onRate={deck.grade}
        />
      )}
    </View>
  );
}

function CardSlot({
  card,
  role,
  style,
  revealed,
  interactive,
  speak,
}: {
  card: StudyCard;
  role: 'front' | 'back';
  style: StyleProp<AnimatedStyle<ViewStyle>>;
  revealed: boolean;
  interactive: boolean;
  speak?: { speakLabel: string; onSpeak: () => void };
}) {
  const spanishOnFront = card.direction === 'es_to_ru';
  return (
    <Animated.View
      style={[styles.slot, style, role === 'front' ? styles.front : styles.back]}
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityElementsHidden={role === 'back'}
      importantForAccessibility={role === 'back' ? 'no-hide-descendants' : 'auto'}
    >
      <FlipCard
        prepared
        cardKey={card.key}
        revealed={revealed}
        front={{ text: card.front, ...(spanishOnFront ? speak : undefined) }}
        back={{ text: card.back, ...(spanishOnFront ? undefined : speak) }}
      />
    </Animated.View>
  );
}

function useCardMotion({
  card,
  nextCard,
  revealed,
  busy,
  rateError,
  onReveal,
  onRate,
}: ReviewDeckProps) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const offscreen = width > 0 ? width + space.xxl : FALLBACK_OFFSCREEN;
  const leaveX = useSharedValue(0);
  const leaveOpacity = useSharedValue(1);
  const enterX = useSharedValue(FALLBACK_OFFSCREEN);

  const settle = () => {
    // The arriving card is already at rest when this render promotes it.
    leaveX.value = 0;
    leaveOpacity.value = 1;
    enterX.value = reduceMotion ? 0 : offscreen;
  };

  const flightModel = useReviewFlight({
    card,
    nextCard,
    revealed,
    busy,
    rateError,
    onReveal,
    onRate,
    onSettle: settle,
  });
  const { flight } = flightModel;

  useEffect(() => {
    writeFlight(flight, { leaveX, leaveOpacity, enterX, offscreen, reduceMotion });
  }, [enterX, flight, leaveOpacity, leaveX, offscreen, reduceMotion]);

  const onDrag = useCallback(
    (translationX: number) => {
      if (reduceMotion || busy || flight || !revealed) return;
      // eslint-disable-next-line react-hooks/immutability -- shared value write
      leaveX.value = translationX;
    },
    [busy, flight, leaveX, reduceMotion, revealed],
  );

  const onRelease = useCallback(
    (translationX: number, velocityX: number) => {
      const springBack = () => {
        // eslint-disable-next-line react-hooks/immutability -- shared value write
        leaveX.value = reduceMotion ? 0 : withSpring(0, motion.spring);
      };
      if (busy || flight || !revealed) {
        springBack();
        return;
      }
      const rating = ratingForSwipe(translationX, velocityX, flightModel.elapsedMs());
      if (!rating) {
        springBack();
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flightModel.grade(rating);
    },
    [busy, flight, flightModel, leaveX, reduceMotion, revealed],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(revealed && !busy && !flight)
        .activeOffsetX([-16, 16])
        .failOffsetY([-24, 24])
        .onUpdate((event) => {
          runOnJS(onDrag)(event.translationX);
        })
        .onEnd((event) => {
          runOnJS(onRelease)(event.translationX, event.velocityX);
        }),
    [busy, flight, onDrag, onRelease, revealed],
  );

  const frontStyle = useAnimatedStyle(() => ({
    opacity: leaveOpacity.value,
    transform: [{ translateX: leaveX.value }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enterX.value }],
  }));

  const onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (current === next ? current : next));
  };

  return { ...flightModel, gesture, frontStyle, backStyle, onLayout };
}

function writeFlight(
  flight: ReviewFlight<StudyCard> | null,
  visuals: {
    leaveX: SharedValue<number>;
    leaveOpacity: SharedValue<number>;
    enterX: SharedValue<number>;
    offscreen: number;
    reduceMotion: boolean;
  },
) {
  const { leaveX, leaveOpacity, enterX, offscreen, reduceMotion } = visuals;
  if (!flight) {
    enterX.value = reduceMotion ? 0 : offscreen;
    return;
  }
  const exit = flight.direction === 'left' ? -offscreen : offscreen;
  if (flight.phase === 'fly') {
    if (reduceMotion) {
      leaveX.value = 0;
      leaveOpacity.value = withTiming(0, { duration: motion.press.duration });
      enterX.value = 0;
      return;
    }
    leaveOpacity.value = 1;
    leaveX.value = withTiming(exit, { duration: reviewTiming.exitMs });
    enterX.value = offscreen;
    return;
  }
  if (flight.phase !== 'enter') return;
  if (reduceMotion) {
    leaveX.value = 0;
    leaveOpacity.value = 0;
    enterX.value = 0;
    return;
  }
  leaveOpacity.value = 1;
  leaveX.value = exit;
  enterX.value = withTiming(0, { duration: reviewTiming.enterMs });
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: space.lg,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  stack: {
    minHeight: 280,
  },
  slot: {
    ...StyleSheet.absoluteFill,
  },
  front: {
    zIndex: 2,
  },
  back: {
    zIndex: 1,
  },
  caption: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    top: '42%',
    zIndex: 3,
    textAlign: 'center',
  },
});
