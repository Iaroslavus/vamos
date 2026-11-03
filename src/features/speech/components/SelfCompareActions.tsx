import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { space } from '@/theme/tokens';

type SelfCompareActionsProps = {
  againDisabled: boolean;
  onSame: () => void;
  onAgain: () => void;
};

/** The learner decides whether the take matches the sample. */
export function SelfCompareActions({ againDisabled, onSame, onAgain }: SelfCompareActionsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <Button
        title={t('speech.soundsSame')}
        variant="primary"
        onPress={onSame}
        style={styles.wide}
      />
      <Button
        title={t('speech.again')}
        variant="secondary"
        disabled={againDisabled}
        onPress={onAgain}
        style={styles.wide}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: space.sm,
  },
  wide: {
    alignSelf: 'stretch',
  },
});
