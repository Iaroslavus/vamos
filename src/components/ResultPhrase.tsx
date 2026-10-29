import * as Haptics from 'expo-haptics';
import { BookmarkPlus, Volume2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { colors, radius, space } from '@/theme/tokens';

type ResultPairLine = {
  text: string;
  wrong: boolean;
};

type ResultPhraseProps = {
  phraseEs?: string;
  phraseTr?: string;
  pairs?: readonly ResultPairLine[];
  correctLabel?: string;
  speakText?: string;
  audio?: string | null;
  autoPlay?: boolean;
  onSave?: () => void;
};

/** Spanish, its translation, listen, and the phrasebook bookmark. */
export function ResultPhrase({
  phraseEs,
  phraseTr,
  pairs,
  correctLabel,
  speakText,
  audio,
  autoPlay = false,
  onSave,
}: ResultPhraseProps) {
  const { t } = useTranslation();
  const hasPhrase = Boolean(phraseEs || phraseTr || (pairs && pairs.length > 0));

  useEffect(() => {
    if (!autoPlay || !speakText) return;
    void playLessonAudio({ audio: audio ?? null, text: speakText });
    return () => {
      void stopLessonAudio();
    };
  }, [audio, autoPlay, speakText]);

  if (!hasPhrase && !speakText && !onSave) return null;

  const play = () => {
    if (!speakText) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void playLessonAudio({ audio: audio ?? null, text: speakText });
  };

  return (
    <View style={styles.root}>
      {correctLabel ? (
        <Text variant="caption" color={colors.inkMuted} style={styles.center}>
          {correctLabel}
        </Text>
      ) : null}

      {pairs && pairs.length > 0 ? (
        <View style={styles.pairs}>
          {pairs.map((pair) => (
            <Text
              key={pair.text}
              variant="bodyBold"
              color={pair.wrong ? colors.errorInk : colors.ink}
              style={styles.pair}
            >
              {pair.text}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.phrase}>
          {phraseEs ? (
            <Text variant="h2" style={styles.center}>
              {phraseEs}
            </Text>
          ) : null}
          {phraseTr ? (
            <Text variant="body" color={colors.inkMuted} style={styles.center}>
              {phraseTr}
            </Text>
          ) : null}
        </View>
      )}

      {speakText || onSave ? (
        <View style={styles.actions}>
          {speakText ? (
            <Pressable
              onPress={play}
              accessibilityRole="button"
              accessibilityLabel={t('lesson.playAudio')}
              style={({ pressed }) => [styles.listen, pressed && styles.pressed]}
            >
              <Volume2 size={22} color={colors.inkOnDark} strokeWidth={2.2} />
              <Text variant="bodyBold" color={colors.inkOnDark}>
                {t('lesson.playAudio')}
              </Text>
            </Pressable>
          ) : null}
          {onSave ? (
            <IconButton accessibilityLabel={t('lesson.feedbackSave')} onPress={onSave}>
              <BookmarkPlus size={22} color={colors.ink} strokeWidth={2.2} />
            </IconButton>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.sm,
  },
  phrase: {
    gap: space.xs,
  },
  pairs: {
    gap: space.xs,
  },
  pair: {
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  listen: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.blue,
  },
  pressed: {
    opacity: 0.85,
  },
});
