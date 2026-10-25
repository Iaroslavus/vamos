import { ArrowRightLeft, Trash2, Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

type FolderItemRowProps = {
  es: string;
  ru: string;
  editable: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onMove: () => void;
};

export function FolderItemRow({ es, ru, editable, onPlay, onRemove, onMove }: FolderItemRowProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text variant="bodyBold">{es}</Text>
        {ru ? (
          <Text variant="caption" color={colors.inkMuted}>
            {ru}
          </Text>
        ) : null}
      </View>
      <IconButton accessibilityLabel={t('vocab.play', { es })} onPress={onPlay}>
        <Volume2 color={colors.blue} size={22} strokeWidth={2.2} />
      </IconButton>
      {editable ? (
        <IconButton accessibilityLabel={t('vocab.move', { es })} onPress={onMove}>
          <ArrowRightLeft color={colors.ink} size={22} strokeWidth={2.2} />
        </IconButton>
      ) : null}
      {editable ? (
        <IconButton accessibilityLabel={t('vocab.remove', { es })} onPress={onRemove}>
          <Trash2 color={colors.coral} size={22} strokeWidth={2.2} />
        </IconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
});
