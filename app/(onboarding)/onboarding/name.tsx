import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { LanguageOptions } from '@/features/settings/LanguageOptions';
import { listTopics } from '@/features/content/loader';
import { parseDisplayName } from '@/features/learner/profile';
import { useSaveLearner } from '@/features/learner/useLearnerProfile';
import { buildTodayPlan } from '@/features/today/course';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

const DAY_ONE = buildTodayPlan(listTopics(), []).dayOneLessonId;

export default function NameScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const save = useSaveLearner();
  const [name, setName] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const start = () => {
    const parsed = parseDisplayName(name);
    if (!parsed || saving) {
      setError(parsed == null);
      return;
    }
    setSaving(true);
    setError(false);
    void save({ name: parsed })
      .then(() => {
        if (DAY_ONE) {
          router.replace({ pathname: '/lesson/[id]', params: { id: DAY_ONE } });
          return;
        }
        router.replace('/(tabs)');
      })
      .catch(() => {
        setSaving(false);
        setError(true);
      });
  };

  return (
    <View style={styles.root}>
      <LanguageOptions variant="switch" />
      <Text variant="h2" accessibilityRole="header">
        {t('onboarding.nameTitle')}
      </Text>
      <Text variant="body" color={colors.inkMuted}>
        {t('onboarding.nameBody')}
      </Text>
      <View style={styles.field}>
        <Text variant="bodyBold">{t('onboarding.nameLabel')}</Text>
        <TextInput
          accessibilityLabel={t('onboarding.nameLabel')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (error) setError(false);
          }}
          placeholder={t('onboarding.namePlaceholder')}
          placeholderTextColor={colors.inkDisabled}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={60}
          style={styles.input}
        />
      </View>
      {error ? (
        <Text variant="caption" color={colors.errorInk}>
          {t('onboarding.nameInvalid')}
        </Text>
      ) : null}
      <Button title={t('onboarding.nameStart')} disabled={saving} onPress={start} />
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
  field: {
    gap: space.sm,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: type.body.fontSize,
  },
});
