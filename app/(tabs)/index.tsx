import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { LessonPath } from '@/features/path/components/LessonPath';
import { completedLessonIds } from '@/features/path/completedLessons';
import { getCurriculumLessons, type PathNode } from '@/features/path/curriculum';
import { useProgress } from '@/features/progress/useProgress';
import { colors, radius, space } from '@/theme/tokens';

export default function LearnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data } = useProgress();
  const completedIds = useMemo(() => completedLessonIds(data?.lessons ?? []), [data?.lessons]);
  const totalXp = data?.totalXp ?? 0;

  const lessons = useMemo(() => getCurriculumLessons(), []);
  const unitTitle = lessons[0]
    ? t('learn.unitTitle', { level: lessons[0].level, unit: lessons[0].unit })
    : t('learn.title');

  const onPressNode = (node: PathNode) => {
    if (node.status === 'locked') return;
    router.push(`/lesson/${node.lesson.id}`);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md }]}>
      <View style={styles.header}>
        <View>
          <Text variant="h2">{t('learn.title')}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {unitTitle}
          </Text>
        </View>
        <View style={styles.xpChip} accessibilityLabel={t('learn.xpLabel', { xp: totalXp })}>
          <Text variant="label" color={colors.saffronDeep}>
            XP
          </Text>
          <Text variant="bodyBold" color={colors.ink}>
            {totalXp}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.goalCard}>
          <Text variant="caption" color={colors.inkMuted}>
            {t('learn.dayGoalLabel')}
          </Text>
          <Text variant="bodyBold">{t('learn.dayGoalValue')}</Text>
        </View>

        <LessonPath lessons={lessons} completedIds={completedIds} onPressNode={onPressNode} />

        <View style={styles.actions}>
          <Button
            title={t('common.openOnboarding')}
            variant="secondary"
            onPress={() => router.push('/onboarding')}
          />
        </View>

        {__DEV__ ? (
          <Pressable
            onPress={() => router.push('/dev/components')}
            accessibilityRole="button"
            style={styles.devLink}
          >
            <Text variant="bodyBold" color={colors.coral} style={styles.devLinkText}>
              {t('common.devComponents')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    gap: space.md,
  },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.saffronSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 44,
  },
  scroll: {
    paddingBottom: space.xxxl,
    paddingHorizontal: space.sm,
  },
  actions: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
  },
  goalCard: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  devLink: {
    alignSelf: 'center',
    marginTop: space.lg,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  devLinkText: {
    textAlign: 'center',
  },
});
