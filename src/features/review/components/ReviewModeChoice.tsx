import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

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
      <View style={styles.option}>
        <Button title={t('review.modeCards')} onPress={() => onChoose('cards')} />
        <Text variant="caption" color={colors.inkMuted} style={styles.center}>
          {t('review.modeCardsHint')}
        </Text>
      </View>
      <View style={styles.option}>
        <Button
          title={t('review.modeQuick')}
          variant="secondary"
          onPress={() => onChoose('quick')}
        />
        <Text variant="caption" color={colors.inkMuted} style={styles.center}>
          {t('review.modeQuickHint', { count: QUICK_REVIEW_LIMIT })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  option: {
    gap: space.sm,
  },
  center: {
    textAlign: 'center',
  },
});
