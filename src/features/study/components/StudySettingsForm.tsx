import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import {
  ACCENT_LEVELS,
  STUDY_COUNTS,
  STUDY_DIRECTIONS,
  STUDY_FILTERS,
  type StudySettings,
} from '../types';

type StudySettingsFormProps = {
  settings: StudySettings;
  onChange: (settings: StudySettings) => void;
};

export function StudySettingsForm({ settings, onChange }: StudySettingsFormProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <Choices
        label={t('study.directionLabel')}
        value={settings.direction}
        options={STUDY_DIRECTIONS.map((id) => ({ id, label: t(`study.direction.${id}`) }))}
        onChange={(direction) => onChange({ ...settings, direction })}
      />
      <Choices
        label={t('study.filterLabel')}
        value={settings.filter}
        options={STUDY_FILTERS.map((id) => ({ id, label: t(`study.filter.${id}`) }))}
        onChange={(filter) => onChange({ ...settings, filter })}
      />
      <Choices
        label={t('study.countLabel')}
        value={settings.count}
        options={STUDY_COUNTS.map((id) => ({ id, label: t('study.countOption', { count: id }) }))}
        onChange={(count) => onChange({ ...settings, count })}
      />
      <View style={styles.switchRow}>
        <Text variant="bodyBold">{t('study.autoplay')}</Text>
        <Switch
          accessibilityLabel={t('study.autoplay')}
          value={settings.autoplay}
          onValueChange={(autoplay) => onChange({ ...settings, autoplay })}
          trackColor={{ false: colors.borderStrong, true: colors.teal }}
          thumbColor={colors.surface}
        />
      </View>
      <Choices
        label={t('study.accentLabel')}
        value={settings.accentStrictness}
        options={ACCENT_LEVELS.map((id) => ({ id, label: t(`study.accent.${id}`) }))}
        onChange={(accentStrictness) => onChange({ ...settings, accentStrictness })}
      />
    </View>
  );
}

function Choices<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      <Text variant="bodyBold">{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={String(option.id)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.id)}
              style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
            >
              <Text variant="bodyBold" color={selected ? colors.inkOnDark : colors.ink}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.lg,
  },
  group: {
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  chipOff: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  switchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
});
