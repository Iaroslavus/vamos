import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import type { PathAction } from '../map';

type PathCardProps = {
  eyebrow: string;
  title: string;
  canDo: string;
  lessonCount: number;
  completedLessons: number;
  action: PathAction;
  lessonNumber: number;
  primaryDisabled: boolean;
  onPrimary: () => void;
  onCheatSheet: () => void;
};

export function PathCard({
  eyebrow,
  title,
  canDo,
  lessonCount,
  completedLessons,
  action,
  lessonNumber,
  primaryDisabled,
  onPrimary,
  onCheatSheet,
}: PathCardProps) {
  const { t } = useTranslation();
  const primary =
    action === 'continue'
      ? t('path.action.continue', { lesson: lessonNumber })
      : t(`path.action.${action}`);

  return (
    <View style={styles.card}>
      <Text variant="label" color={colors.coral}>
        {eyebrow}
      </Text>
      <Text variant="h3">{title}</Text>
      {canDo ? (
        <Text variant="body" color={colors.inkMuted} numberOfLines={2}>
          {canDo}
        </Text>
      ) : null}
      {lessonCount > 0 ? (
        <View style={styles.dots} accessibilityElementsHidden>
          {Array.from({ length: lessonCount }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index < completedLessons ? styles.dotDone : null,
                index === completedLessons && index < lessonCount ? styles.dotNext : null,
              ]}
            />
          ))}
        </View>
      ) : null}
      <Button title={primary} disabled={primaryDisabled} onPress={onPrimary} />
      <Button title={t('path.cheatsheet')} variant="secondary" onPress={onCheatSheet} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  dot: {
    width: 10,
    height: 10,
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
