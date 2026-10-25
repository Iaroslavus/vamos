import { BookmarkCheck, BookmarkPlus, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

type IntroCardHeaderProps = {
  TopicIcon: LucideIcon;
  saved: boolean;
  saveLabel: string;
  onSave: () => void;
};

export function IntroCardHeader({ TopicIcon, saved, saveLabel, onSave }: IntroCardHeaderProps) {
  return (
    <View style={styles.top}>
      <View style={styles.balance} />
      <View
        style={styles.iconBadge}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <TopicIcon size={28} color={colors.ink} strokeWidth={2.2} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saveLabel}
        accessibilityState={{ selected: saved }}
        onPress={onSave}
        style={[styles.save, saved && styles.saveOn]}
      >
        {saved ? (
          <BookmarkCheck size={22} color={colors.ink} strokeWidth={2.2} />
        ) : (
          <BookmarkPlus size={22} color={colors.ink} strokeWidth={2.2} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balance: {
    width: 44,
    height: 44,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffronSoft,
  },
  save: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  saveOn: {
    backgroundColor: colors.saffronSoft,
    borderColor: colors.saffron,
  },
});
