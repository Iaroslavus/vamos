import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import type { SkillBar, SkillId } from '../overview';

type SkillListProps = {
  skills: readonly SkillBar[];
};

const skillColor: Record<SkillId, string> = {
  vocabulary: colors.saffron,
  grammar: colors.coral,
  listening: colors.blue,
  speaking: colors.teal,
};

export function SkillList({ skills }: SkillListProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text variant="h3" accessibilityRole="header">
        {t('progress.skillsTitle')}
      </Text>
      {skills.map((skill) => {
        const name = t(`progress.skills.${skill.id}`);
        const percent = Math.round(skill.progress * 100);
        return (
          <View key={skill.id} style={styles.skill}>
            <View style={styles.head}>
              <Text variant="bodyBold">{name}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {t('progress.skillValue', { percent })}
              </Text>
            </View>
            <ProgressBar
              progress={skill.progress}
              color={skillColor[skill.id]}
              accessibilityLabel={t('progress.skillLabel', { skill: name, percent })}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  skill: {
    gap: space.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
});
