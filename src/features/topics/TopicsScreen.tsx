import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { RetryNote } from '@/components/RetryNote';
import { listLessons, listTopics } from '@/features/content/loader';
import type { CefrLevel } from '@/features/content/schema';
import { initialLevel, levelHasContent, topicSections } from '@/features/topics/catalog';
import { LevelSwitcher } from '@/features/topics/components/LevelSwitcher';
import { TopicCatalog } from '@/features/topics/components/TopicCatalog';
import { TopicSearchField } from '@/features/topics/components/TopicSearchField';
import { TopicsSkeleton } from '@/features/topics/components/TopicsSkeleton';
import { useCompletedLessons } from '@/features/topics/useCompletedLessons';
import { colors, space } from '@/theme/tokens';

export function TopicsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const topics = useMemo(() => listTopics(), []);
  const lessons = useMemo(() => listLessons(), []);
  const [level, setLevel] = useState<CefrLevel>(() => initialLevel(topics));
  const [query, setQuery] = useState('');
  const progress = useCompletedLessons();
  const sections = useMemo(
    () => topicSections(topics, lessons, progress.completedIds, level, query),
    [lessons, level, progress.completedIds, query, topics],
  );

  const openTopic = (id: string) => {
    router.push({ pathname: '/topics/[id]', params: { id } });
  };

  let body = (
    <TopicCatalog
      emptyLevel={!levelHasContent(topics, level)}
      sections={sections}
      onOpen={openTopic}
    />
  );
  if (progress.isLoading) body = <TopicsSkeleton label={t('topics.loading')} />;
  else if (progress.isError && !progress.data) {
    body = (
      <RetryNote
        title={t('topics.loadError')}
        action={t('common.retry')}
        onPress={() => {
          void progress.refetch();
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.search}>
        <TopicSearchField value={query} onChangeText={setQuery} />
      </View>
      <LevelSwitcher
        level={level}
        hasContent={(item) => levelHasContent(topics, item)}
        onChange={setLevel}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingTop: space.lg,
    gap: space.md,
  },
  search: {
    paddingHorizontal: space.xl,
  },
});
