import { ChevronLeft, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { BottomSheet } from '@/features/vocab/components/BottomSheet';
import { colors, space } from '@/theme/tokens';

import { orderedStudyModes } from '../modes';
import { dueStudyCount, selectStudyUnits } from '../sessionPlan';
import type { StudyMode, StudySettings, StudyUnit } from '../types';
import { StudyModeCard } from './StudyModeCard';
import { StudySettingsForm } from './StudySettingsForm';

type StudySheetProps = {
  visible: boolean;
  units: readonly StudyUnit[];
  settings: StudySettings;
  onClose: () => void;
  onChangeSettings: (settings: StudySettings) => void;
  onStart: (mode: StudyMode) => void;
};

export function StudySheet({
  visible,
  units,
  settings,
  onClose,
  onChangeSettings,
  onStart,
}: StudySheetProps) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<'modes' | 'settings'>('modes');
  const introduced = units.some((unit) => unit.introduced);
  const due = dueStudyCount(units);
  const modes = orderedStudyModes();
  const close = () => {
    setPanel('modes');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        {panel === 'settings' ? (
          <IconButton accessibilityLabel={t('study.back')} onPress={() => setPanel('modes')}>
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
          </IconButton>
        ) : (
          <View style={styles.headerGap} />
        )}
        <Text variant="h3" style={styles.title}>
          {panel === 'settings' ? t('study.settingsTitle') : t('studyModes.title')}
        </Text>
        {panel === 'modes' ? (
          <IconButton accessibilityLabel={t('study.settings')} onPress={() => setPanel('settings')}>
            <Settings size={22} color={colors.ink} strokeWidth={2.2} />
          </IconButton>
        ) : (
          <View style={styles.headerGap} />
        )}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {panel === 'settings' ? (
          <StudySettingsForm settings={settings} onChange={onChangeSettings} />
        ) : (
          <>
            {introduced ? null : (
              <Text variant="body" color={colors.inkMuted}>
                {t('study.noneIntroduced')}
              </Text>
            )}
            {introduced &&
            modes.every((mode) => selectStudyUnits(units, settings, mode).length === 0) ? (
              <Text variant="body" color={colors.inkMuted}>
                {t('study.noneFiltered')}
              </Text>
            ) : null}
            {modes.map((mode) => (
              <StudyModeCard
                key={mode}
                mode={mode}
                count={selectStudyUnits(units, settings, mode).length}
                due={due}
                onStart={onStart}
              />
            ))}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  headerGap: {
    width: 44,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 520,
  },
  scrollContent: {
    gap: space.sm,
    paddingBottom: space.md,
  },
});
