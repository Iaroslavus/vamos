import { useNavigation, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { getTopic } from '@/features/content/loader';
import { contentLocale, textOf } from '@/features/content/text';
import type { Item } from '@/features/content/schema';
import { useProgress } from '@/features/progress/useProgress';
import { track } from '@/lib/analytics';
import { colors, radius, space } from '@/theme/tokens';

import { lessonToStudy, topicPhraseGroups } from './catalog';
import { CheatsheetFooter } from './components/CheatsheetFooter';
import { CheatsheetSearch } from './components/CheatsheetSearch';
import { CheatsheetToast } from './components/CheatsheetToast';
import { PhraseCard } from './components/PhraseCard';
import { PhraseList } from './components/PhraseList';
import { TopicChips } from './components/TopicChips';
import { useCheatsheetQuery } from './hooks/useCheatsheetQuery';
import { usePhrasePlayback } from './hooks/usePhrasePlayback';
import { useSaveTopicPhrases } from './hooks/useSaveTopicPhrases';

const ICON_STROKE = 2.2;

type CheatsheetScreenProps = {
  topicId: string | null;
  source: 'path' | 'search';
  autoFocus?: boolean;
};

export function CheatsheetScreen({ topicId, source, autoFocus = false }: CheatsheetScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const language = contentLocale(i18n.language);
  const progress = useProgress();
  const query = useCheatsheetQuery(topicId);
  const playback = usePhrasePlayback();
  const [card, setCard] = useState<Item | null>(null);
  const topic = useMemo(() => readTopic(query.entry?.id ?? null), [query.entry]);
  const groups = useMemo(() => (topic ? topicPhraseGroups(topic) : []), [topic]);
  const itemIds = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => item.id)),
    [groups],
  );
  const save = useSaveTopicPhrases(topic, itemIds);
  const completed = useMemo(
    () =>
      new Set(
        (progress.data?.lessons ?? [])
          .filter((lesson) => lesson.status === 'completed')
          .map((lesson) => lesson.lessonId),
      ),
    [progress.data],
  );

  useEffect(() => {
    track('cheatsheet_open', { topicId, source });
  }, [source, topicId]);

  useEffect(() => {
    if (!card) return;
    return listenBeforeRemove(navigation, () => setCard(null));
  }, [card, navigation]);

  const lessonId = topic ? lessonToStudy(topic, completed) : null;
  const bottom = Math.max(insets.bottom, space.md);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <IconButton accessibilityLabel={t('cheatsheet.back')} onPress={() => router.back()}>
          <ChevronLeft color={colors.ink} size={22} strokeWidth={ICON_STROKE} />
        </IconButton>
        <Text variant="h3" accessibilityRole="header" style={styles.title}>
          {t('cheatsheet.title')}
        </Text>
      </View>
      <CheatsheetSearch value={query.query} onChangeText={query.setQuery} autoFocus={autoFocus} />
      <Text variant="body" style={styles.hint}>
        {t('cheatsheet.hint')}
      </Text>
      <TopicChips
        chips={query.chips.map((entry) => ({
          id: entry.id,
          label: t('cheatsheet.chip', { title: textOf(entry.title, language), level: entry.level }),
          selected: entry.id === query.selectedId,
        }))}
        onPress={query.setSelectedId}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {topic ? (
          <PhraseList
            groups={groups}
            language={language}
            playingId={playback.playingId}
            onPlay={playback.toggle}
            onShow={(item) => {
              setCard(item);
              track('phrase_show', { itemId: item.id });
            }}
          />
        ) : null}
      </ScrollView>
      {topic && lessonId ? (
        <CheatsheetFooter
          studyTitle={t('cheatsheet.study', { count: topic.lessons.length })}
          addLabel={t('cheatsheet.addAll')}
          busy={save.busy}
          paddingBottom={bottom}
          onStudy={() => router.push({ pathname: '/lesson/[id]', params: { id: lessonId } })}
          onAdd={() => {
            void save.addAll();
          }}
        />
      ) : null}
      {card ? (
        <PhraseCard
          phrase={card.es}
          translation={textOf(card.tr, language)}
          onListen={() => playback.play(card)}
          onClose={() => setCard(null)}
        />
      ) : null}
      {save.toast ? (
        <CheatsheetToast toast={save.toast} bottom={bottom + 88} onDismiss={save.dismiss} />
      ) : null}
    </View>
  );
}

function readTopic(id: string | null) {
  if (!id) return null;
  try {
    return getTopic(id);
  } catch {
    return null;
  }
}

type Removable = {
  addListener: (
    event: 'beforeRemove',
    listener: (event: { preventDefault: () => void }) => void,
  ) => () => void;
};

/** The stack back gesture closes the open card before leaving the screen. */
function listenBeforeRemove(navigation: unknown, close: () => void): () => void {
  return (navigation as Removable).addListener('beforeRemove', (event) => {
    event.preventDefault();
    close();
  });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  title: {
    flex: 1,
  },
  hint: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.hint,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
});
