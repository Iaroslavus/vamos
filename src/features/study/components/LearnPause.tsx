import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { SessionBar } from './SessionBar';

type LearnPauseProps = {
  kind: 'break' | 'done';
  learned: number;
  total: number;
  misses: number;
  onContinue: () => void;
  onClose: () => void;
};

export function LearnPause({ kind, learned, total, misses, onContinue, onClose }: LearnPauseProps) {
  const { t } = useTranslation();
  const done = kind === 'done';
  const title = done ? t('study.learnSummaryTitle') : t('study.learnedOf', { learned, total });
  const body = done ? t('study.learnSummaryBody', { learned, total }) : t('study.learnBreakBody');

  return (
    <View style={styles.root} testID={done ? 'learn-summary' : 'learn-break'}>
      <SessionBar current={learned} total={total} onClose={onClose} />
      <View style={styles.body}>
        <Text variant="h2" style={styles.center}>
          {title}
        </Text>
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {body}
        </Text>
        {done && misses > 0 ? (
          <Text variant="caption" color={colors.inkMuted} style={styles.center}>
            {t('study.learnSummaryMisses', { count: misses })}
          </Text>
        ) : null}
        <Button
          title={done ? t('study.backToFolder') : t('study.learnNext')}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
