import { Ellipsis, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { BottomSheet } from '@/features/vocab/components/BottomSheet';
import { colors, space } from '@/theme/tokens';

import { DEFAULT_STUDY_SETTINGS, type StudySettings } from '../types';
import { StudySettingsForm } from './StudySettingsForm';

export type SessionPlace = {
  current: number;
  total: number;
};

type SessionBarProps = {
  current: number;
  total: number;
  onClose: () => void;
  onShuffle?: () => void;
  shuffleDisabled?: boolean;
  onPrevious?: () => void;
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
};

export function SessionBar({
  current,
  total,
  onClose,
  onShuffle,
  shuffleDisabled = false,
  onPrevious,
  settings,
  onChangeSettings,
}: SessionBarProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeMenu = () => setMenu(false);

  return (
    <View style={styles.bar}>
      <IconButton accessibilityLabel={t('session.close')} onPress={onClose}>
        <X size={22} color={colors.ink} strokeWidth={2.2} />
      </IconButton>
      <Text variant="bodyBold" style={styles.counter} testID="session-counter">
        {t('session.counter', { current, total })}
      </Text>
      <IconButton accessibilityLabel={t('session.menu')} onPress={() => setMenu(true)}>
        <Ellipsis size={22} color={colors.ink} strokeWidth={2.2} />
      </IconButton>
      {menu ? (
        <BottomSheet visible onClose={closeMenu}>
          <View style={styles.menu}>
            <Button
              title={t('session.shuffle')}
              variant="secondary"
              accessibilityLabel={t('session.shuffle')}
              disabled={!onShuffle || shuffleDisabled}
              onPress={() => {
                closeMenu();
                onShuffle?.();
              }}
            />
            {onPrevious ? (
              <Button
                title={t('session.previous')}
                variant="secondary"
                accessibilityLabel={t('session.previous')}
                onPress={() => {
                  closeMenu();
                  onPrevious();
                }}
              />
            ) : null}
            <Button
              title={t('session.settings')}
              variant="secondary"
              accessibilityLabel={t('session.settings')}
              onPress={() => {
                closeMenu();
                setSettingsOpen(true);
              }}
            />
          </View>
        </BottomSheet>
      ) : null}
      {settingsOpen ? (
        <SessionSettingsSheet
          settings={settings}
          onChangeSettings={onChangeSettings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </View>
  );
}

function SessionSettingsSheet({
  settings,
  onChangeSettings,
  onClose,
}: {
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(settings ?? DEFAULT_STUDY_SETTINGS);
  const controlled = Boolean(settings && onChangeSettings);
  const value = controlled && settings ? settings : local;
  const change = (next: StudySettings) => {
    if (controlled && onChangeSettings) onChangeSettings(next);
    else setLocal(next);
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <StudySettingsForm settings={value} onChange={change} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  counter: {
    flex: 1,
    textAlign: 'center',
  },
  menu: {
    gap: space.sm,
  },
});
