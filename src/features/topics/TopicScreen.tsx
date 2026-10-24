import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { listLessons, listScenes, listTopics } from '@/features/content/loader';
import { buildTopicDetail } from '@/features/topics/catalog';
import { TopicDetailView } from '@/features/topics/components/TopicDetailView';
import { TopicsSkeleton } from '@/features/topics/components/TopicsSkeleton';
import { useCompletedLessons } from '@/features/topics/useCompletedLessons';
import { colors, space } from '@/theme/tokens';

export function TopicScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const topicId = firstParam(params.id);
  const topics = useMemo(() => listTopics(), []);
  const lessons = useMemo(() => listLessons(), []);
  const scenes = useMemo(() => listScenes(), []);
  const progress = useCompletedLessons();
  const topic = topics.find((item) => item.id === topicId) ?? null;
  const detail = useMemo(() => {
    if (!topicId) return null;
    return buildTopicDetail(topicId, topics, lessons, scenes, progress.completedIds);
  }, [lessons, progress.completedIds, scenes, topicId, topics]);

  const title = topic?.title_ru ?? t('topics.missing');
  let body = detail ? (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TopicDetailView
        detail={detail}
        onOpenLesson={(lessonId) => {
          router.push({ pathname: '/lesson/[id]', params: { id: lessonId } });
        }}
      />
    </ScrollView>
  ) : (
    <Missing message={t('topics.missing')} />
  );

  if (!topic) body = <Missing message={t('topics.missing')} />;
  else if (progress.isLoading) body = <TopicsSkeleton label={t('topics.loading')} />;
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
    <>
      <Stack.Screen options={{ title }} />
      {body}
    </>
  );
}

function Missing({ message }: { message: string }) {
  return (
    <View style={styles.missing}>
      <Text variant="h3" style={styles.missingText}>
        {message}
      </Text>
    </View>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value !== '') return value;
  const first = Array.isArray(value) ? value[0] : undefined;
  return typeof first === 'string' && first !== '' ? first : null;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
  },
  missing: {
    flex: 1,
    backgroundColor: colors.ground,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  missingText: {
    textAlign: 'center',
  },
});
