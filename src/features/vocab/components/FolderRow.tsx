import * as Haptics from 'expo-haptics';
import { Bookmark, Flame, Folder, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { resolveTopicIcon } from '@/features/content/topicIcons';
import { TopicGlyph } from '@/features/topics/components/TopicGlyph';
import { colors, radius, space } from '@/theme/tokens';

import { folderSwatch, folderTint } from '../folderColor';
import type { FolderRowModel } from '../hooks/useFolders';

type FolderRowProps = {
  row: FolderRowModel;
  onPress: () => void;
};

export function FolderRow({ row, onPress }: FolderRowProps) {
  const { t } = useTranslation();
  const units = t('vocab.units', { count: row.count });
  const due = t('vocab.due', { count: row.due });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('vocab.folderLabel', { name: row.title, units, due })}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={[styles.icon, { backgroundColor: folderTint(row.folder.color) }]}>
        <TopicGlyph icon={iconFor(row)} color={folderSwatch(row.folder.color)} size={22} />
      </View>
      <View style={styles.copy}>
        <Text variant="bodyBold">{row.title}</Text>
        <Text variant="caption" color={colors.inkMuted}>
          {t('vocab.rowMeta', { units, due })}
        </Text>
      </View>
    </Pressable>
  );
}

function iconFor(row: FolderRowModel): LucideIcon {
  if (row.folder.systemKey === 'favorites') return Bookmark;
  if (row.folder.systemKey === 'difficult') return Flame;
  if (row.folder.topicId) return resolveTopicIcon(row.icon);
  return Folder;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
});
