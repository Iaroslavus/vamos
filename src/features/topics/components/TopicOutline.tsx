import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import type { TopicDetail } from '@/features/topics/catalog';
import { TopicStepMark } from '@/features/topics/components/TopicStepMark';
import { colors, motion, radius, space } from '@/theme/tokens';

type TopicOutlineProps = {
  detail: TopicDetail;
  onOpenLesson: (lessonId: string) => void;
};

export function TopicOutline({ detail, onOpenLesson }: TopicOutlineProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.block}>
      <Text variant="h3" accessibilityRole="header">
        {t('topics.lessonsTitle')}
      </Text>
      {detail.lessons.map((lesson, index) => {
        const locked = lesson.status === 'locked';
        const status = t(`learn.status.${lesson.status}`);
        return (
          <Appear key={lesson.id} delay={Math.min(index, 8) * motion.stagger}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: locked }}
              accessibilityLabel={t('topics.stepLabel', { title: lesson.title, status })}
              accessibilityHint={locked ? t('learn.lockedHint') : undefined}
              disabled={locked}
              onPress={() => {
                if (locked) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenLesson(lesson.id);
              }}
              style={({ pressed }) => [
                styles.row,
                lesson.status === 'current' ? styles.current : null,
                locked ? styles.locked : null,
                pressed && !locked ? styles.pressed : null,
              ]}
            >
              <TopicStepMark status={lesson.status} index={index} />
              <View style={styles.copy}>
                <Text variant="bodyBold" color={locked ? colors.inkDisabled : colors.ink}>
                  {lesson.title}
                </Text>
                <Text variant="caption" color={statusColor(lesson.status)}>
                  {status}
                </Text>
              </View>
            </Pressable>
          </Appear>
        );
      })}
      <Appear delay={Math.min(detail.lessons.length, 8) * motion.stagger}>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={
            detail.scene.status === 'locked'
              ? t('topics.sceneLocked', { title: detail.scene.title })
              : t('topics.sceneReady', { title: detail.scene.title })
          }
          style={[styles.row, detail.scene.status === 'locked' ? styles.locked : null]}
        >
          <TopicStepMark status={detail.scene.status} />
          <View style={styles.copy}>
            <Text
              variant="bodyBold"
              color={detail.scene.status === 'locked' ? colors.inkDisabled : colors.ink}
            >
              {detail.scene.title}
            </Text>
            <Text variant="caption" color={colors.inkMuted}>
              {detail.scene.status === 'locked'
                ? t('topics.sceneLockedCaption')
                : t('topics.sceneCaption')}
            </Text>
          </View>
        </View>
      </Appear>
    </View>
  );
}

function statusColor(status: TopicDetail['lessons'][number]['status']) {
  if (status === 'completed') return colors.teal;
  if (status === 'current') return colors.coral;
  return colors.inkDisabled;
}

const styles = StyleSheet.create({
  block: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 64,
    paddingVertical: space.sm,
    paddingRight: space.lg,
    paddingLeft: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  current: {
    borderColor: colors.coral,
  },
  locked: {
    backgroundColor: colors.surfaceSunken,
  },
  pressed: {
    opacity: 0.85,
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
});
