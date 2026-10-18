import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { getCurriculumLessons, type PathNode } from '@/features/path/curriculum';
import { LessonPath } from '@/features/path/components/LessonPath';
import { usePathProgressStore } from '@/features/path/progressStore';
import { colors, radius, space } from '@/theme/tokens';

export default function LearnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completedIds = usePathProgressStore((s) => s.completedIds);
  const totalXp = usePathProgressStore((s) => s.totalXp);

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
