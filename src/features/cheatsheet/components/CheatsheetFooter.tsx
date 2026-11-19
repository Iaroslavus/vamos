import { FolderPlus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { colors, space } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type CheatsheetFooterProps = {
  studyTitle: string;
  addLabel: string;
  busy: boolean;
  paddingBottom: number;
  onStudy: () => void;
  onAdd: () => void;
};

export function CheatsheetFooter({
  studyTitle,
  addLabel,
  busy,
  paddingBottom,
  onStudy,
  onAdd,
}: CheatsheetFooterProps) {
  return (
    <View style={[styles.footer, { paddingBottom }]}>
      <Button title={studyTitle} onPress={onStudy} style={styles.study} />
      <IconButton accessibilityLabel={addLabel} disabled={busy} onPress={onAdd}>
        <FolderPlus color={colors.ink} size={22} strokeWidth={ICON_STROKE} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.ground,
  },
  study: {
    flex: 1,
  },
});
