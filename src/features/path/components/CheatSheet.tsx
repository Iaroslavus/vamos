import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { useAudioPreference } from '@/features/audio/preference';
import { getLesson } from '@/features/content/loader';
import { BottomSheet } from '@/features/vocab/components/BottomSheet';
import { FolderPhraseList } from '@/features/vocab/components/FolderPhraseList';
import { colors, space } from '@/theme/tokens';

type CheatSheetProps = {
  visible: boolean;
  title: string;
  lessonIds: readonly string[];
  onClose: () => void;
};

export function CheatSheet({ visible, title, lessonIds, onClose }: CheatSheetProps) {
  const { t } = useTranslation();
  const preference = useAudioPreference();
  const itemIds = useMemo(() => phraseIds(lessonIds), [lessonIds]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="h3">{t('path.cheatsheetTitle')}</Text>
      <Text variant="body" color={colors.inkMuted}>
        {title}
      </Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        <FolderPhraseList
          itemIds={itemIds}
          editable={false}
          canAdd={false}
          preference={preference}
          onRemove={noop}
          onMove={noop}
          onEdit={noop}
          onAdd={noop}
        />
      </ScrollView>
    </BottomSheet>
  );
}

function phraseIds(lessonIds: readonly string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const lessonId of lessonIds) {
    let items: readonly string[] = [];
    try {
      items = getLesson(lessonId).items;
    } catch {
      items = [];
    }
    for (const id of items) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function noop(): void {
  return undefined;
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 420,
  },
  content: {
    gap: space.sm,
    paddingBottom: space.lg,
  },
});
