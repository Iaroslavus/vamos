import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { useAudioPreference } from '@/features/audio/preference';
import type { Item } from '@/features/content/schema';
import { contentLocale, textOf } from '@/features/content/text';
import { resolveTopicIcon } from '@/features/content/topicIcons';
import { SpeakPracticeSheet } from '@/features/speech/components/SpeakPracticeSheet';
import { AddToVocabSheet } from '@/features/vocab/components/AddToVocabSheet';
import { useItemSaveState } from '@/features/vocab/hooks/useItemSaveState';
import { colors, radius, space } from '@/theme/tokens';

import { useCardSwipe } from '../hooks/useCardSwipe';
import { useIntroPlayback } from '../hooks/useIntroPlayback';
import { itemAudioPath, showsSayRu, type AudioPreference } from '../intro';
import { IntroCard } from './IntroCard';
import { IntroWhySheet } from './IntroWhySheet';

type IntroStepProps = {
  item: Item;
  /** 1-based place among this lesson's new units. */
  position: number;
  total: number;
  /** Topic icon slug, for example `wave`. */
  topicIcon?: string;
  /** Which recording to prefer. Defaults to the profile variant. */
  audioVariant?: AudioPreference;
  onNext: () => void;
  /** Optional notice when practice opens. The sheet itself does not grade the lesson. */
  onRepeatAloud?: () => void;
};

export function IntroStep({
  item,
  position,
  total,
  topicIcon,
  audioVariant: audioVariantProp,
  onNext,
  onRepeatAloud,
}: IntroStepProps) {
  const { t, i18n } = useTranslation();
  const profilePreference = useAudioPreference();
  const audioVariant = audioVariantProp ?? profilePreference;
  const language = contentLocale(i18n.language);
  const insets = useSafeAreaInsets();
  const saveState = useItemSaveState([item.id]);
  const { playPhrase, playPart } = useIntroPlayback(item, audioVariant);
  const [whyItemId, setWhyItemId] = useState<string | null>(null);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [practiceItemId, setPracticeItemId] = useState<string | null>(null);
  const saveLabel = saveState.inFavorites
    ? t('lesson.introSaved')
    : saveState.inAny
      ? t('lesson.introInVocab')
      : t('lesson.introSave');
  const whyOpen = whyItemId === item.id;
  const why = textOf(item.why, language);
  const sayRu = showsSayRu(item.level) ? textOf(item.say, language) : null;
  const speechParts = item.parts.map((part) => ({ es: part.es, ru: textOf(part.tr, language) }));
  const TopicIcon = resolveTopicIcon(topicIcon);
  const swipe = useCardSwipe(onNext, item.id);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="bodyBold" color={colors.inkMuted} style={styles.progress}>
          {t('lesson.introProgress', { current: position, total })}
        </Text>

        <Animated.View collapsable={false} {...swipe.panHandlers} style={swipe.style}>
          <Appear key={item.id}>
            <IntroCard
              item={item}
              TopicIcon={TopicIcon}
              sayRu={sayRu}
              saved={saveState.inAny}
              saveLabel={saveLabel}
              onPlay={playPhrase}
              onPlayPart={playPart}
              onSave={() => setVocabOpen(true)}
              onWhy={() => setWhyItemId(item.id)}
            />
          </Appear>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button
          title={t('lesson.introRepeat')}
          variant="secondary"
          onPress={() => {
            onRepeatAloud?.();
            setPracticeItemId(item.id);
          }}
        />
        <Button title={t('lesson.continue')} variant="primary" onPress={onNext} />
      </View>

      <IntroWhySheet
        visible={whyOpen && Boolean(why)}
        text={why}
        onClose={() => setWhyItemId(null)}
      />
      <AddToVocabSheet
        visible={vocabOpen}
        itemIds={[item.id]}
        onClose={() => setVocabOpen(false)}
        onChanged={saveState.reload}
      />
      <SpeakPracticeSheet
        visible={practiceItemId === item.id}
        mode="practice"
        phrase={item.es}
        audio={itemAudioPath(item, audioVariant)}
        sayRu={sayRu}
        parts={speechParts}
        onClose={() => setPracticeItemId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  progress: {
    textAlign: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.ground,
  },
});
