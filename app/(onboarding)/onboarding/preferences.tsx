import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { LEARNING_GOALS, type LearningGoal } from '@/features/learner/profile';
import { useSaveLearner } from '@/features/learner/useLearnerProfile';
import { DAILY_GOAL_MINUTES, type DailyGoalMinutes } from '@/features/progress/streak';
import { colors, radius, space } from '@/theme/tokens';

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const save = useSaveLearner();
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [minutes, setMinutes] = useState<DailyGoalMinutes>(10);
  const [saving, setSaving] = useState(false);

  const finish = () => {
    if (!goal || saving) return;
    setSaving(true);
    void save({ goal, dailyMinutes: minutes, preferencesAsked: true })
      .then(() => router.replace('/(tabs)'))
      .catch(() => setSaving(false));
  };

  return (
    <View style={styles.root}>
      <Text variant="h2" accessibilityRole="header">
        {t('onboarding.preferencesTitle')}
      </Text>
      <Text variant="body" color={colors.inkMuted}>
        {t('onboarding.preferencesBody')}
      </Text>
      <Text variant="bodyBold">{t('onboarding.goalQuestion')}</Text>
      <View style={styles.choices}>
        {LEARNING_GOALS.map((item) => {
          const selected = item === goal;
          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`onboarding.goals.${item}`)}
              onPress={() => setGoal(item)}
              style={[styles.chip, selected ? styles.chipSelected : null]}
            >
              <Text variant="bodyBold" color={selected ? colors.inkOnDark : colors.ink}>
                {t(`onboarding.goals.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="bodyBold">{t('onboarding.minutesQuestion')}</Text>
      <View style={styles.choices}>
        {DAILY_GOAL_MINUTES.map((item) => {
          const selected = item === minutes;
          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t('onboarding.minutes', { count: item })}
              onPress={() => setMinutes(item)}
              style={[styles.chip, selected ? styles.chipSelected : null]}
            >
              <Text variant="bodyBold" color={selected ? colors.inkOnDark : colors.ink}>
                {t('onboarding.minutes', { count: item })}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        title={t('onboarding.preferencesContinue')}
        disabled={!goal || saving}
        onPress={finish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingHorizontal: space.xl,
    paddingTop: space.xxxl,
    gap: space.lg,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
});
