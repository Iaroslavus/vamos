import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TopicTestEntry } from '@/features/topicTest/components/TopicTestEntry';
import { colors, radius, space } from '@/theme/tokens';

import type { PathAction } from '../map';

type PathCardProps = {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  canDo: string;
  lessonCount: number;
  completedLessons: number;
  action: PathAction;
  lessonNumber: number;
  /** Topic cards show «Урок 2 з 4» above the title. Chests do not. */
  showProgress?: boolean;
  primaryDisabled: boolean;
  onPrimary: () => void;
  onCheatSheet?: () => void;
  onTopicTest?: () => void;
};

export function PathCard({
  eyebrow,
  eyebrowColor,
  title,
  canDo,
  lessonCount,
  completedLessons,
  action,
  lessonNumber,
  showProgress = false,
  primaryDisabled,
  onPrimary,
  onCheatSheet,
  onTopicTest,
}: PathCardProps) {
  const { t } = useTranslation();
  const primary = action === 'continue' ? t('path.action.continue') : t(`path.action.${action}`);
  const lessonCurrent = action === 'repeat' ? lessonCount : lessonNumber;
  const progress =
    showProgress && lessonCount > 0
      ? t('path.lessonOf', { current: lessonCurrent, total: lessonCount })
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text variant="label" color={eyebrowColor} numberOfLines={1} style={styles.eyebrow}>
          {eyebrow}
        </Text>
        {lessonCount > 0 ? (
          <View style={styles.dots} accessibilityElementsHidden>
            {Array.from({ length: lessonCount }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index < completedLessons ? styles.dotDone : null,
                  action === 'continue' && index === completedLessons ? styles.dotNext : null,
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
      {progress ? (
        <Text variant="caption" color={colors.ink}>
          {progress}
        </Text>
      ) : null}
      <Text variant="h3" numberOfLines={2}>
        {title}
      </Text>
      {canDo ? (
        <Text variant="caption" color={colors.inkMuted} numberOfLines={2}>
          {canDo}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          title={primary}
          variant={action === 'continue' ? 'primary' : 'success'}
          disabled={primaryDisabled}
          onPress={onPrimary}
          style={styles.primary}
        />
        {onCheatSheet ? (
          <Button
            title={t('path.cheatsheetTitle')}
            variant="secondary"
            onPress={onCheatSheet}
            style={styles.secondary}
          />
        ) : null}
      </View>
      {onTopicTest ? <TopicTestEntry onPress={onTopicTest} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs + 2,
    marginHorizontal: space.md,
    marginBottom: space.md,
    paddingHorizontal: space.lg + 2,
    paddingVertical: space.lg,
    borderRadius: 28,
    backgroundColor: colors.surface,
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  eyebrow: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm + 2,
    marginTop: space.sm,
  },
  primary: {
    flex: 1,
  },
  secondary: {
    flexShrink: 0,
    minWidth: 128,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 18,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
  dotDone: {
    backgroundColor: colors.teal,
  },
  dotNext: {
    backgroundColor: colors.coral,
  },
});
