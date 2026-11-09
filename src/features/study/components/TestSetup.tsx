import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { planTest, withTestKind } from '../testMode';
import {
  STUDY_DIRECTIONS,
  TEST_COUNTS,
  TEST_KINDS,
  type StudyUnit,
  type TestKind,
  type TestSettings,
} from '../types';

type TestSetupProps = {
  units: readonly StudyUnit[];
  settings: TestSettings;
  onChange: (settings: TestSettings) => void;
  onStart: () => void;
};

export function TestSetup({ units, settings, onChange, onStart }: TestSetupProps) {
  const { t } = useTranslation();
  const ready = useMemo(() => planTest(units, settings).length > 0, [settings, units]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h2" style={styles.center}>
          {t('study.test.setupTitle')}
        </Text>
        <Choices
          label={t('study.test.countLabel')}
          value={settings.count}
          options={TEST_COUNTS.map((id) => ({
            id,
            label: t('study.test.countOption', { count: id }),
          }))}
          onChange={(count) => onChange({ ...settings, count })}
        />
        <KindChoices
          label={t('study.test.kindsLabel')}
          selected={settings.kinds}
          onToggle={(kind) => onChange(withTestKind(settings, kind))}
        />
        <Choices
          label={t('study.directionLabel')}
          value={settings.direction}
          options={STUDY_DIRECTIONS.map((id) => ({ id, label: t(`study.direction.${id}`) }))}
          onChange={(direction) => onChange({ ...settings, direction })}
        />
        {ready ? null : (
          <Text variant="body" color={colors.inkMuted} style={styles.center}>
            {t('study.test.tooFew')}
          </Text>
        )}
      </ScrollView>
      <Button title={t('study.test.start')} disabled={!ready} onPress={onStart} />
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

function KindChoices({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: readonly TestKind[];
  onToggle: (kind: TestKind) => void;
}) {
  const { t } = useTranslation();
  const on = new Set(selected);
  return (
    <View accessibilityLabel={label} style={styles.group}>
      <Text variant="bodyBold">{label}</Text>
      <View style={styles.chips}>
        {TEST_KINDS.map((kind) => {
          const picked = on.has(kind);
          const name = t(`study.test.kind.${kind}`);
          return (
            <Pressable
              key={kind}
              accessibilityRole="checkbox"
              accessibilityLabel={name}
              accessibilityState={{ checked: picked }}
              onPress={() => onToggle(kind)}
              style={[styles.chip, picked ? styles.chipOn : styles.chipOff]}
            >
              <Text variant="bodyBold" color={picked ? colors.inkOnDark : colors.ink}>
                {name}
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
    flex: 1,
    gap: space.lg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: space.lg,
    paddingBottom: space.lg,
  },
  center: {
    textAlign: 'center',
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
});
