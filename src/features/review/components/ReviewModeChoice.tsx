import { Layers, Zap, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { QUICK_REVIEW_LIMIT, type ReviewStudyMode } from '../exercises';

export type { ReviewStudyMode };

type ReviewModeChoiceProps = {
  count: number;
  onChoose: (mode: ReviewStudyMode) => void;
};

export function ReviewModeChoice({ count, onChoose }: ReviewModeChoiceProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <Text variant="h2" style={styles.center}>
        {t('review.chooseTitle')}
      </Text>
      <Text variant="body" color={colors.inkMuted} style={styles.center}>
        {t('review.chooseCount', { count })}
      </Text>
      <View style={styles.row}>
        <ModeCard
          title={t('review.modeCards')}
          hint={t('review.modeCardsHint')}
          Icon={Layers}
          testID="review-mode-cards"
          onPress={() => onChoose('cards')}
        />
        <ModeCard
          title={t('review.modeQuick')}
          hint={t('review.modeQuickHint', { count: QUICK_REVIEW_LIMIT })}
          Icon={Zap}
          badge={t('review.recommended')}
          testID="review-mode-quick"
          onPress={() => onChoose('quick')}
        />
      </View>
    </View>
  );
}

type ModeCardProps = {
  title: string;
  hint: string;
  Icon: LucideIcon;
  badge?: string;
  testID: string;
  onPress: () => void;
};

function ModeCard({ title, hint, Icon, badge, testID, onPress }: ModeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      onPress={onPress}
      style={styles.card}
    >
      {badge ? (
        <View style={styles.badge}>
          <Text variant="caption" color={colors.tealDeep}>
            {badge}
          </Text>
        </View>
      ) : (
        <View style={styles.badgeSpacer} />
      )}
      <View style={styles.icon}>
        <Icon size={28} color={colors.ink} strokeWidth={2.2} />
      </View>
      <Text variant="h3" style={styles.center}>
        {title}
      </Text>
      <Text variant="caption" color={colors.inkMuted} style={styles.center}>
        {hint}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.sm,
  },
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 180,
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  badge: {
    alignSelf: 'center',
    minHeight: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
    paddingHorizontal: space.sm,
    justifyContent: 'center',
  },
  badgeSpacer: {
    height: 24,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffronSoft,
  },
  center: {
    textAlign: 'center',
  },
});
