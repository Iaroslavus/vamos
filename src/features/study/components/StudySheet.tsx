import * as Haptics from 'expo-haptics';
import {
  BookOpen,
  ChevronLeft,
  ClipboardCheck,
  Layers,
  Mic,
  Pencil,
  Puzzle,
  RotateCcw,
  Settings,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { BottomSheet } from '@/features/vocab/components/BottomSheet';
import { colors, radius, space } from '@/theme/tokens';

import { estimateStudyMinutes, isPlayableStudyMode, orderedStudyModes } from '../modes';
import { selectStudyUnits } from '../sessionPlan';
import type { StudyMode, StudySettings, StudyUnit } from '../types';
import { StudySettingsForm } from './StudySettingsForm';

const ICONS: Record<StudyMode, LucideIcon> = {
  review: RotateCcw,
  flashcards: Layers,
  learn: BookOpen,
  test: ClipboardCheck,
  match: Puzzle,
  spell: Pencil,
  speak: Mic,
  quick5: Zap,
};

const TINT: Record<StudyMode, { face: string; icon: string }> = {
  review: { face: colors.tealSoft, icon: colors.teal },
  flashcards: { face: colors.saffronSoft, icon: colors.saffronDeep },
  learn: { face: colors.errorSoft, icon: colors.coral },
  test: { face: colors.surfaceSunken, icon: colors.ink },
  match: { face: colors.saffronSoft, icon: colors.saffronDeep },
  spell: { face: colors.errorSoft, icon: colors.coral },
  speak: { face: colors.tealSoft, icon: colors.teal },
  quick5: { face: colors.surfaceSunken, icon: colors.ink },
};

type StudySheetProps = {
  visible: boolean;
  units: readonly StudyUnit[];
  settings: StudySettings;
  lastMode: StudyMode | null;
  onClose: () => void;
  onChangeSettings: (settings: StudySettings) => void;
  onStart: (mode: StudyMode) => void;
};

export function StudySheet({
  visible,
  units,
  settings,
  lastMode,
  onClose,
  onChangeSettings,
  onStart,
}: StudySheetProps) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<'modes' | 'settings'>('modes');
  const introduced = units.some((unit) => unit.introduced);
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
          {panel === 'settings' ? t('study.settingsTitle') : t('study.sheetTitle')}
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
            orderedStudyModes(lastMode).every(
              (mode) => selectStudyUnits(units, settings, mode).length === 0,
            ) ? (
              <Text variant="body" color={colors.inkMuted}>
                {t('study.noneFiltered')}
              </Text>
            ) : null}
            {orderedStudyModes(lastMode).map((mode) => (
              <ModeCard
                key={mode}
                mode={mode}
                count={selectStudyUnits(units, settings, mode).length}
                onStart={onStart}
              />
            ))}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function ModeCard({
  mode,
  count,
  onStart,
}: {
  mode: StudyMode;
  count: number;
  onStart: (mode: StudyMode) => void;
}) {
  const { t } = useTranslation();
  const ready = isPlayableStudyMode(mode);
  const enabled = ready && count > 0;
  const Icon = ICONS[mode];
  const tint = TINT[mode];
  const title = t(`study.modes.${mode}.title`);
  const body = t(`study.modes.${mode}.body`);
  const minutes = t('study.minutes', { count: estimateStudyMinutes(mode, count) });
  const soon = t('study.soon');

  return (
    <Pressable
      testID={`study-mode-${mode}`}
      accessibilityRole="button"
      accessibilityLabel={t(ready ? 'study.modeLabel' : 'study.modeSoonLabel', {
        title,
        minutes,
        body,
        soon,
      })}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onStart(mode);
      }}
      style={({ pressed }) => [
        styles.card,
        !enabled && styles.cardOff,
        pressed && enabled && styles.cardPressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: tint.face }]}>
        <Icon size={22} color={tint.icon} strokeWidth={2.2} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text variant="bodyBold">{title}</Text>
          {ready ? null : (
            <Text variant="caption" color={colors.coral}>
              {soon}
            </Text>
          )}
        </View>
        <Text variant="caption" color={colors.inkMuted}>
          {minutes}
        </Text>
        <Text variant="caption" color={colors.inkMuted}>
          {body}
        </Text>
      </View>
    </Pressable>
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
  card: {
    minHeight: 44,
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.ground,
  },
  cardOff: {
    opacity: 0.55,
  },
  cardPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: space.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
});
